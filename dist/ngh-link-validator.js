"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateLinks = void 0;
const util_1 = require("util");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const core = __importStar(require("@actions/core"));
const glob_1 = require("glob");
const file_reader_1 = require("./file-reader");
const markdown_link_extractor_1 = __importDefault(require("markdown-link-extractor"));
const readdir = util_1.promisify(fs.readdir);
const stat = util_1.promisify(fs.stat);
function getFiles(dir) {
    return __awaiter(this, void 0, void 0, function* () {
        const subdirs = yield readdir(dir);
        const files = yield Promise.all(subdirs.map((subdir) => __awaiter(this, void 0, void 0, function* () {
            const res = path.resolve(dir, subdir);
            return (yield stat(res)).isDirectory() ? getFiles(res) : [res];
        })));
        return files.reduce((a, f) => a.concat(f), []);
    });
}
const validateLinks = (workspaceRoot, mdGlob) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        //TODO: improve this implementation - e.g. use the glob patterns from the yaml.schemas settings
        core.info('following filepaths found');
        const filePaths = yield new Promise((c, e) => {
            glob_1.glob(mdGlob, {
                cwd: workspaceRoot,
                silent: true,
                nodir: true
            }, 
            // tslint:disable-next-line
            (err, files) => {
                if (err) {
                    e(err);
                }
                c(files);
            });
        });
        core.info(filePaths.join(' - '));
        return yield Promise.all(filePaths.map((filePath) => __awaiter(void 0, void 0, void 0, function* () {
            let result = true;
            try {
                // Check the yaml metadata link
                /*
                if (link) {
                  result = false
                  let linkPath = path.join(workspaceRoot, link)
                  linkPath = linkPath.replace(/#\w+\s*$/, '')
                  // TODO: Support also checking hashtags!
                  for (const lp of [linkPath, `${linkPath}.md`]) {
                    if (fs.existsSync(lp)) {
                      result = true
                    }
                  }
      
                  core.info(filePath)
                  if (!result) {
                    core.warning(`${filePath} had dead link to ${link}`)
                  }
                }
                */
                // Extract all md links and add yaml link
                const markdown = fs.readFileSync(path.join(workspaceRoot, filePath), { encoding: 'utf8' });
                let { links } = markdown_link_extractor_1.default(markdown);
                const yamlDocument = yield file_reader_1.getYaml(path.join(workspaceRoot, filePath));
                const link = yamlDocument ? yamlDocument['link'] : null;
                if (link) {
                    links = [link].concat(links); // prepend
                }
                links = links.map((l) => l.replace(/#\w+\s*$/, ''));
                links = links.filter((l) => !l.endsWith('.md'));
                links = links.filter((l) => l.startsWith('http'));
                if (links.length > 0) {
                    core.debug(` ${filePath} found links`);
                    core.debug('  ' + links.join(' - '));
                    let files = yield getFiles(workspaceRoot);
                    files = files.map(file => file.replace(workspaceRoot, ''));
                    links.map((l) => {
                        let linkFound = false;
                        if (files.find(f => f.endsWith(`/${l}.md`)))
                            linkFound = true; // just a file
                        if (files.find(f => f.endsWith(`/${l}/index.md`)))
                            linkFound = true; // a folder
                        if (!linkFound) {
                            core.warning(`${filePath} had dead link to ${l}`);
                            result = false;
                        }
                    });
                }
                else {
                    core.debug(`no links for ${filePath} found`);
                }
            }
            catch (e) {
                core.error(filePath);
                core.error(e);
                return { filePath, valid: false };
            }
            core.debug(`${filePath} handled`);
            return { filePath, valid: result };
        })));
    }
    catch (err) {
        core.error(workspaceRoot);
        core.error(err);
        return [{ filePath: workspaceRoot, valid: false }];
    }
});
exports.validateLinks = validateLinks;
