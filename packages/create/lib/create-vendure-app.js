"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVendureApp = void 0;
/* eslint-disable no-console */
const prompts_1 = require("@clack/prompts");
const commander_1 = require("commander");
const fs_extra_1 = __importDefault(require("fs-extra"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const picocolors_1 = __importDefault(require("picocolors"));
const constants_1 = require("./constants");
const gather_user_responses_1 = require("./gather-user-responses");
const helpers_1 = require("./helpers");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../package.json');
(0, helpers_1.checkNodeVersion)(constants_1.REQUIRED_NODE_VERSION);
let projectName;
// Set the environment variable which can then be used to
// conditionally modify behaviour of core or plugins.
const createEnvVar = 'CREATING_VENDURE_APP';
process.env[createEnvVar] = 'true';
commander_1.program
    .version(packageJson.version)
    .arguments('<project-directory>')
    .usage(`${picocolors_1.default.green('<project-directory>')} [options]`)
    .action(name => {
    projectName = name;
})
    .option('--log-level <logLevel>', "Log level, either 'silent', 'info', or 'verbose'", /^(silent|info|verbose)$/i, 'silent')
    .option('--use-npm', 'Uses npm rather than Yarn as the default package manager')
    .option('--ci', 'Runs without prompts for use in CI scenarios')
    .parse(process.argv);
const options = commander_1.program.opts();
void createVendureApp(projectName, options.useNpm, options.logLevel || 'silent', options.ci);
async function createVendureApp(name, useNpm, logLevel, isCi = false) {
    if (!runPreChecks(name, useNpm)) {
        return;
    }
    (0, prompts_1.intro)(`Let's create a ${picocolors_1.default.blue(picocolors_1.default.bold('Vendure App'))} ✨ ${picocolors_1.default.dim(`v${packageJson.version}`)}`);
    const portSpinner = (0, prompts_1.spinner)();
    let port = constants_1.SERVER_PORT;
    const attemptedPortRange = 20;
    portSpinner.start(`Establishing port...`);
    while (await (0, helpers_1.isServerPortInUse)(port)) {
        const nextPort = port + 1;
        portSpinner.message(picocolors_1.default.yellow(`Port ${port} is in use. Attempting to use ${nextPort}`));
        port = nextPort;
        if (port > constants_1.SERVER_PORT + attemptedPortRange) {
            portSpinner.stop(picocolors_1.default.red('Could not find an available port'));
            (0, prompts_1.outro)(`Please ensure there is a port available between ${constants_1.SERVER_PORT} and ${constants_1.SERVER_PORT + attemptedPortRange}`);
            process.exit(1);
        }
    }
    portSpinner.stop(`Using port ${port}`);
    process.env.PORT = port.toString();
    const root = path_1.default.resolve(name);
    const appName = path_1.default.basename(root);
    const scaffoldExists = (0, helpers_1.scaffoldAlreadyExists)(root, name);
    const yarnAvailable = (0, helpers_1.yarnIsAvailable)();
    let packageManager = 'npm';
    if (yarnAvailable && !useNpm) {
        packageManager = (await (0, prompts_1.select)({
            message: 'Which package manager should be used?',
            options: [
                { label: 'npm', value: 'npm' },
                { label: 'yarn', value: 'yarn' },
            ],
            initialValue: 'yarn',
        }));
        (0, gather_user_responses_1.checkCancel)(packageManager);
    }
    if (scaffoldExists) {
        console.log(picocolors_1.default.yellow('It appears that a new Vendure project scaffold already exists. Re-using the existing files...'));
        console.log();
    }
    const { dbType, configSource, envSource, envDtsSource, indexSource, indexWorkerSource, readmeSource, dockerfileSource, dockerComposeSource, populateProducts, } = isCi
        ? await (0, gather_user_responses_1.gatherCiUserResponses)(root, packageManager)
        : await (0, gather_user_responses_1.gatherUserResponses)(root, scaffoldExists, packageManager);
    const originalDirectory = process.cwd();
    process.chdir(root);
    if (packageManager !== 'npm' && !(0, helpers_1.checkThatNpmCanReadCwd)()) {
        process.exit(1);
    }
    const packageJsonContents = {
        name: appName,
        version: '0.1.0',
        private: true,
        scripts: {
            'dev:server': 'ts-node ./src/index.ts',
            'dev:worker': 'ts-node ./src/index-worker.ts',
            dev: packageManager === 'yarn' ? 'concurrently yarn:dev:*' : 'concurrently npm:dev:*',
            build: 'tsc',
            'start:server': 'node ./dist/index.js',
            'start:worker': 'node ./dist/index-worker.js',
            start: packageManager === 'yarn' ? 'concurrently yarn:start:*' : 'concurrently npm:start:*',
        },
    };
    const setupSpinner = (0, prompts_1.spinner)();
    setupSpinner.start(`Setting up your new Vendure project in ${picocolors_1.default.green(root)}\nThis may take a few minutes...`);
    const rootPathScript = (fileName) => path_1.default.join(root, `${fileName}.ts`);
    const srcPathScript = (fileName) => path_1.default.join(root, 'src', `${fileName}.ts`);
    fs_extra_1.default.writeFileSync(path_1.default.join(root, 'package.json'), JSON.stringify(packageJsonContents, null, 2) + os_1.default.EOL);
    const { dependencies, devDependencies } = (0, helpers_1.getDependencies)(dbType, `@${packageJson.version}`);
    setupSpinner.stop(`Created ${picocolors_1.default.green('package.json')}`);
    const installSpinner = (0, prompts_1.spinner)();
    installSpinner.start(`Installing ${dependencies[0]} + ${dependencies.length - 1} more dependencies`);
    try {
        await (0, helpers_1.installPackages)(root, packageManager === 'yarn', dependencies, false, logLevel, isCi);
    }
    catch (e) {
        (0, prompts_1.outro)(picocolors_1.default.red(`Failed to install dependencies. Please try again.`));
        process.exit(1);
    }
    installSpinner.stop(`Successfully installed ${dependencies.length} dependencies`);
    if (devDependencies.length) {
        const installDevSpinner = (0, prompts_1.spinner)();
        installDevSpinner.start(`Installing ${devDependencies[0]} + ${devDependencies.length - 1} more dev dependencies`);
        try {
            await (0, helpers_1.installPackages)(root, packageManager === 'yarn', devDependencies, true, logLevel, isCi);
        }
        catch (e) {
            (0, prompts_1.outro)(picocolors_1.default.red(`Failed to install dev dependencies. Please try again.`));
            process.exit(1);
        }
        installDevSpinner.stop(`Successfully installed ${devDependencies.length} dev dependencies`);
    }
    const scaffoldSpinner = (0, prompts_1.spinner)();
    scaffoldSpinner.start(`Generating app scaffold`);
    fs_extra_1.default.ensureDirSync(path_1.default.join(root, 'src'));
    const assetPath = (fileName) => path_1.default.join(__dirname, '../assets', fileName);
    const configFile = srcPathScript('vendure-config');
    try {
        await fs_extra_1.default
            .writeFile(configFile, configSource)
            .then(() => fs_extra_1.default.writeFile(path_1.default.join(root, '.env'), envSource))
            .then(() => fs_extra_1.default.writeFile(srcPathScript('environment.d'), envDtsSource))
            .then(() => fs_extra_1.default.writeFile(srcPathScript('index'), indexSource))
            .then(() => fs_extra_1.default.writeFile(srcPathScript('index-worker'), indexWorkerSource))
            .then(() => fs_extra_1.default.writeFile(path_1.default.join(root, 'README.md'), readmeSource))
            .then(() => fs_extra_1.default.writeFile(path_1.default.join(root, 'Dockerfile'), dockerfileSource))
            .then(() => fs_extra_1.default.writeFile(path_1.default.join(root, 'docker-compose.yml'), dockerComposeSource))
            .then(() => fs_extra_1.default.mkdir(path_1.default.join(root, 'src/plugins')))
            .then(() => fs_extra_1.default.copyFile(assetPath('gitignore.template'), path_1.default.join(root, '.gitignore')))
            .then(() => fs_extra_1.default.copyFile(assetPath('tsconfig.template.json'), path_1.default.join(root, 'tsconfig.json')))
            .then(() => createDirectoryStructure(root))
            .then(() => copyEmailTemplates(root));
    }
    catch (e) {
        (0, prompts_1.outro)(picocolors_1.default.red(`Failed to create app scaffold. Please try again.`));
        process.exit(1);
    }
    scaffoldSpinner.stop(`Generated app scaffold`);
    const populateSpinner = (0, prompts_1.spinner)();
    populateSpinner.start(`Initializing your new Vendure server`);
    // register ts-node so that the config file can be loaded
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require(path_1.default.join(root, 'node_modules/ts-node')).register();
    try {
        const { populate } = await Promise.resolve(`${path_1.default.join(root, 'node_modules/@vendure/core/cli/populate')}`).then(s => __importStar(require(s)));
        const { bootstrap, DefaultLogger, LogLevel, JobQueueService } = await Promise.resolve(`${path_1.default.join(root, 'node_modules/@vendure/core/dist/index')}`).then(s => __importStar(require(s)));
        const { config } = await Promise.resolve(`${configFile}`).then(s => __importStar(require(s)));
        const assetsDir = path_1.default.join(__dirname, '../assets');
        const initialDataPath = path_1.default.join(assetsDir, 'initial-data.json');
        const vendureLogLevel = logLevel === 'silent'
            ? LogLevel.Error
            : logLevel === 'verbose'
                ? LogLevel.Verbose
                : LogLevel.Info;
        const bootstrapFn = async () => {
            var _a;
            await (0, helpers_1.checkDbConnection)(config.dbConnectionOptions, root);
            const _app = await bootstrap(Object.assign(Object.assign({}, config), { apiOptions: Object.assign(Object.assign({}, ((_a = config.apiOptions) !== null && _a !== void 0 ? _a : {})), { port }), silent: logLevel === 'silent', dbConnectionOptions: Object.assign(Object.assign({}, config.dbConnectionOptions), { synchronize: true }), logger: new DefaultLogger({ level: vendureLogLevel }), importExportOptions: {
                    importAssetsDir: path_1.default.join(assetsDir, 'images'),
                } }));
            await _app.get(JobQueueService).start();
            return _app;
        };
        const app = await populate(bootstrapFn, initialDataPath, populateProducts ? path_1.default.join(assetsDir, 'products.csv') : undefined);
        // Pause to ensure the worker jobs have time to complete.
        if (isCi) {
            console.log('[CI] Pausing before close...');
        }
        await new Promise(resolve => setTimeout(resolve, isCi ? 30000 : 2000));
        await app.close();
        if (isCi) {
            console.log('[CI] Pausing after close...');
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
    }
    catch (e) {
        console.log(e);
        (0, prompts_1.outro)(picocolors_1.default.red(`Failed to initialize server. Please try again.`));
        process.exit(1);
    }
    populateSpinner.stop(`Server successfully initialized${populateProducts ? ' and populated' : ''}`);
    const startCommand = packageManager === 'yarn' ? 'yarn dev' : 'npm run dev';
    const nextSteps = [
        `${picocolors_1.default.green('Success!')} Created a new Vendure server at:`,
        `\n`,
        picocolors_1.default.italic(root),
        `\n`,
        `We suggest that you start by typing:`,
        `\n`,
        picocolors_1.default.gray('$ ') + picocolors_1.default.blue(picocolors_1.default.bold(`cd ${name}`)),
        picocolors_1.default.gray('$ ') + picocolors_1.default.blue(picocolors_1.default.bold(`${startCommand}`)),
    ];
    (0, prompts_1.note)(nextSteps.join('\n'));
    (0, prompts_1.outro)(`Happy hacking!`);
    process.exit(0);
}
exports.createVendureApp = createVendureApp;
/**
 * Run some initial checks to ensure that it is okay to proceed with creating
 * a new Vendure project in the given location.
 */
function runPreChecks(name, useNpm) {
    if (typeof name === 'undefined') {
        console.error('Please specify the project directory:');
        console.log(`  ${picocolors_1.default.cyan(commander_1.program.name())} ${picocolors_1.default.green('<project-directory>')}`);
        console.log();
        console.log('For example:');
        console.log(`  ${picocolors_1.default.cyan(commander_1.program.name())} ${picocolors_1.default.green('my-vendure-app')}`);
        process.exit(1);
        return false;
    }
    const root = path_1.default.resolve(name);
    fs_extra_1.default.ensureDirSync(name);
    if (!(0, helpers_1.isSafeToCreateProjectIn)(root, name)) {
        process.exit(1);
    }
    return true;
}
/**
 * Generate the default directory structure for a new Vendure project
 */
async function createDirectoryStructure(root) {
    await fs_extra_1.default.ensureDir(path_1.default.join(root, 'static', 'email', 'test-emails'));
    await fs_extra_1.default.ensureDir(path_1.default.join(root, 'static', 'assets'));
}
/**
 * Copy the email templates into the app
 */
async function copyEmailTemplates(root) {
    const templateDir = path_1.default.join(root, 'node_modules/@vendure/email-plugin/templates');
    try {
        await fs_extra_1.default.copy(templateDir, path_1.default.join(root, 'static', 'email', 'templates'));
    }
    catch (err) {
        console.error(picocolors_1.default.red('Failed to copy email templates.'));
    }
}
//# sourceMappingURL=create-vendure-app.js.map