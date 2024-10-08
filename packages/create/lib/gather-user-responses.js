"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkCancel = exports.gatherCiUserResponses = exports.gatherUserResponses = void 0;
const prompts_1 = require("@clack/prompts");
const shared_constants_1 = require("@vendure/common/lib/shared-constants");
const crypto_1 = require("crypto");
const fs_extra_1 = __importDefault(require("fs-extra"));
const handlebars_1 = __importDefault(require("handlebars"));
const path_1 = __importDefault(require("path"));
/* eslint-disable no-console */
/**
 * Prompts the user to determine how the new Vendure app should be configured.
 */
async function gatherUserResponses(root, alreadyRanScaffold, packageManager) {
    const dbType = (await (0, prompts_1.select)({
        message: 'Which database are you using?',
        options: [
            { label: 'MySQL', value: 'mysql' },
            { label: 'MariaDB', value: 'mariadb' },
            { label: 'Postgres', value: 'postgres' },
            { label: 'SQLite', value: 'sqlite' },
            { label: 'SQL.js', value: 'sqljs' },
        ],
        initialValue: 'sqlite',
    }));
    checkCancel(dbType);
    const hasConnection = dbType !== 'sqlite' && dbType !== 'sqljs';
    const dbHost = hasConnection
        ? await (0, prompts_1.text)({
            message: "What's the database host address?",
            initialValue: 'localhost',
        })
        : '';
    checkCancel(dbHost);
    const dbPort = hasConnection
        ? await (0, prompts_1.text)({
            message: 'What port is the database listening on?',
            initialValue: defaultDBPort(dbType).toString(),
        })
        : '';
    checkCancel(dbPort);
    const dbName = hasConnection
        ? await (0, prompts_1.text)({
            message: "What's the name of the database?",
            initialValue: 'vendure',
        })
        : '';
    checkCancel(dbName);
    const dbSchema = dbType === 'postgres'
        ? await (0, prompts_1.text)({
            message: "What's the schema name we should use?",
            initialValue: 'public',
        })
        : '';
    checkCancel(dbSchema);
    const dbSSL = dbType === 'postgres'
        ? await (0, prompts_1.select)({
            message: 'Use SSL to connect to the database? (only enable if your database provider supports SSL)',
            options: [
                { label: 'no', value: false },
                { label: 'yes', value: true },
            ],
            initialValue: false,
        })
        : false;
    checkCancel(dbSSL);
    const dbUserName = hasConnection
        ? await (0, prompts_1.text)({
            message: "What's the database user name?",
        })
        : '';
    checkCancel(dbUserName);
    const dbPassword = hasConnection
        ? await (0, prompts_1.text)({
            message: "What's the database password?",
            defaultValue: '',
        })
        : '';
    checkCancel(dbPassword);
    const superadminIdentifier = await (0, prompts_1.text)({
        message: 'What identifier do you want to use for the superadmin user?',
        initialValue: shared_constants_1.SUPER_ADMIN_USER_IDENTIFIER,
    });
    checkCancel(superadminIdentifier);
    const superadminPassword = await (0, prompts_1.text)({
        message: 'What password do you want to use for the superadmin user?',
        initialValue: shared_constants_1.SUPER_ADMIN_USER_PASSWORD,
    });
    checkCancel(superadminPassword);
    const populateProducts = await (0, prompts_1.select)({
        message: 'Populate with some sample product data?',
        options: [
            { label: 'yes', value: true },
            { label: 'no', value: false },
        ],
        initialValue: true,
    });
    checkCancel(populateProducts);
    const answers = {
        dbType,
        dbHost,
        dbPort,
        dbName,
        dbSchema,
        dbUserName,
        dbPassword,
        dbSSL,
        superadminIdentifier,
        superadminPassword,
        populateProducts,
    };
    return Object.assign(Object.assign({}, (await generateSources(root, answers, packageManager))), { dbType, populateProducts: answers.populateProducts, superadminIdentifier: answers.superadminIdentifier, superadminPassword: answers.superadminPassword });
}
exports.gatherUserResponses = gatherUserResponses;
/**
 * Returns mock "user response" without prompting, for use in CI
 */
async function gatherCiUserResponses(root, packageManager) {
    const ciAnswers = {
        dbType: 'sqlite',
        dbHost: '',
        dbPort: '',
        dbName: 'vendure',
        dbUserName: '',
        dbPassword: '',
        populateProducts: true,
        superadminIdentifier: shared_constants_1.SUPER_ADMIN_USER_IDENTIFIER,
        superadminPassword: shared_constants_1.SUPER_ADMIN_USER_PASSWORD,
    };
    return Object.assign(Object.assign({}, (await generateSources(root, ciAnswers, packageManager))), { dbType: ciAnswers.dbType, populateProducts: ciAnswers.populateProducts, superadminIdentifier: ciAnswers.superadminIdentifier, superadminPassword: ciAnswers.superadminPassword });
}
exports.gatherCiUserResponses = gatherCiUserResponses;
function checkCancel(value) {
    if ((0, prompts_1.isCancel)(value)) {
        (0, prompts_1.cancel)('Setup cancelled.');
        process.exit(0);
    }
    return true;
}
exports.checkCancel = checkCancel;
/**
 * Create the server index, worker and config source code based on the options specified by the CLI prompts.
 */
async function generateSources(root, answers, packageManager) {
    const assetPath = (fileName) => path_1.default.join(__dirname, '../assets', fileName);
    /**
     * Helper to escape single quotes only. Used when generating the config file since e.g. passwords
     * might use special chars (`< > ' "` etc) which Handlebars would be default convert to HTML entities.
     * Instead, we disable escaping and use this custom helper to escape only the single quote character.
     */
    handlebars_1.default.registerHelper('escapeSingle', (aString) => {
        return typeof aString === 'string' ? aString.replace(/'/g, "\\'") : aString;
    });
    const templateContext = Object.assign(Object.assign({}, answers), { useYarn: packageManager === 'yarn', dbType: answers.dbType === 'sqlite' ? 'better-sqlite3' : answers.dbType, name: path_1.default.basename(root), isSQLite: answers.dbType === 'sqlite', isSQLjs: answers.dbType === 'sqljs', requiresConnection: answers.dbType !== 'sqlite' && answers.dbType !== 'sqljs', cookieSecret: (0, crypto_1.randomBytes)(16).toString('base64url') });
    async function createSourceFile(filename, noEscape = false) {
        const template = await fs_extra_1.default.readFile(assetPath(filename), 'utf-8');
        return handlebars_1.default.compile(template, { noEscape })(templateContext);
    }
    return {
        indexSource: await createSourceFile('index.hbs'),
        indexWorkerSource: await createSourceFile('index-worker.hbs'),
        configSource: await createSourceFile('vendure-config.hbs', true),
        envSource: await createSourceFile('.env.hbs', true),
        envDtsSource: await createSourceFile('environment.d.hbs', true),
        readmeSource: await createSourceFile('readme.hbs'),
        dockerfileSource: await createSourceFile('Dockerfile.hbs'),
        dockerComposeSource: await createSourceFile('docker-compose.hbs'),
    };
}
function defaultDBPort(dbType) {
    switch (dbType) {
        case 'mysql':
        case 'mariadb':
            return 3306;
        case 'postgres':
            return 5432;
        case 'mssql':
            return 1433;
        case 'oracle':
            return 1521;
        default:
            return 3306;
    }
}
//# sourceMappingURL=gather-user-responses.js.map