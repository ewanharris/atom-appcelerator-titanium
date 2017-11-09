'use babel';

import fs from 'fs';
import Utils from '../utils';
import related from '../related';
import _ from 'underscore';
import find from 'find';
import path from 'path';
import { parseString } from 'xml2js';

const tagRegExp = /(<([^>]+)>)/ig;

module.exports = {
	cfg: {
		regExp: /Alloy\.CFG\.([-a-zA-Z0-9-_\/]*)$/,
		getCompletions(request) {
			let completions = undefined;
			const line = Utils.getLine(request);

			if (this.regExp.test(line)) {
				const cfgPath = path.join(Utils.getAlloyRootPath(), 'config.json');
				const cfgKeys = [];
				completions = [];
				if (Utils.isExistAsFile(cfgPath)) {
					try {
						// merge ally evn and platform(os) keys
						let cfgObj = JSON.parse(Utils.getFileEditor(cfgPath).getText());
						cfgObj = _.reduce(cfgObj, function (memo, value, key) {
							if ((key === "global") || key.startsWith('env:') || key.startsWith('os:')) {
								return _.extend(memo, value);
							} else {
								return memo;
							}
						}
							, {});

						const allKeys = Utils.getAllKeys(cfgObj);
						for (const key of allKeys) {
							completions.push({
								text: key,
								type: 'variable'
							});
						};
					} catch (error) {
						console.log(error);
					}
				}
			}

			return completions;
		}
	},

	i18n: {
		regExp: /(L\(|titleid\s*[:=]\s*)["'](\w*)/,// /L\(["']([^\s\\\(\)"':,;<>~!@\$%\^&\*\|\+=\[\]\{\}`\?\…]*)$/,
		getCompletions(request) {
			let completions = undefined;
			const line = Utils.getLine(request);
			const alloyRootPath = Utils.getAlloyRootPath();
			if (this.regExp.test(line)) {
				const defaultLang = atom.config.get('appc.defaultI18nLanguage');
				const i18nPath = Utils.getI18nPath();
				if (Utils.isExistAsDirectory(i18nPath)) {
					const i18nStringPath = path.join(Utils.getI18nPath(), defaultLang, "strings.xml");
					completions = [];
					if (Utils.isExistAsFile(i18nStringPath)) {
						parseString(Utils.getFileEditor(i18nStringPath).getText(), (error, result) => {
							if (result && result.resources) {
								for (let value of result.resources.string) {
									completions.push({
										text: value.$.name,
										leftLabel: defaultLang,
										rightLabel: value._,
										type: 'variable',
										replacementPrefix: Utils.getCustomPrefix(request),
									})
								}
							}
						});
					}
				}
			}
			return completions;
		}
	},
	image: {
		regExp: /image\s*[:=]\s*["']/,///["']\/i([-a-zA-Z0-9-_\/]*)$/,
		getCompletions(request) {
			// const { prefix } = request;
			let completions = undefined;
			const line = Utils.getLine(request);
			if (this.regExp.test(line)) {
				const alloyRootPath = Utils.getAlloyRootPath();
				const assetPath = path.join(alloyRootPath, 'assets');
				completions = [];
				// limit search to these sub-directories
				let paths = ['images', 'iphone', 'android', 'windows'];
				paths = paths.map(aPath => path.join(assetPath, aPath));
				
				for (const imgPath of paths) {
					if (Utils.isExistAsDirectory(imgPath)) {
						const files = find.fileSync(imgPath);
						const images = [];
						for (const file of files) {
							let prefix, suffix, scale;
							// test whether image is includes scaling factor (for iOS)
							let matches = file.match(/(^[\w\s\/\-\_\(\)]+)(@[\w~]+)(.\w+$)/);
							if (matches && matches.length === 4) {
								prefix = matches[1];
								scale = matches[2];
								suffix = matches[3];
							} else if (!file.endsWith('.DS_Store')) {
								matches = file.match(/(^[\w\s\/\-\_\(\)]+)(.\w+$)/);
								if (matches && matches.length == 3) {
									prefix = matches[1];
									scale = '@1x';
									suffix = matches[2];
								}
							}
							if (prefix && suffix && scale) {
								let image = images.find(image => (image.prefix === prefix && image.suffix === suffix));
								if (image) {
									image.scales.push(scale);
								} else {
									images.push({
										prefix,
										suffix,
										file,
										scales: [scale]
									});
								}
							}
						}

						for (const image of images) {
							let scales;
							if (!(image.scales.length === 1 && image.scales[0] === '@1x')) {
								scales = image.scales.join(', ');
							}
							completions.push({
								type: 'file',
								text: Utils.toUnixPath(`${image.prefix}${image.suffix}`.replace(assetPath, '')),
								rightLabel: scales,
								replacementPrefix: Utils.getCustomPrefix(request),
								iconHTML: `<div style='margin: 0; padding: 2px; height:25px; width:25px;'><div style='margin: 0; padding: 0; background-position: center; background-repeat: no-repeat; background-size: contain; background-image: url(${image.file}); height:25px; width:25px; border:none;'></div></div>`,
							});
						}
					}
				}
			}
			return completions;
		}
	}
};