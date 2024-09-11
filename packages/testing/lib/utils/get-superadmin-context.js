"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSuperadminContext = void 0;
const core_1 = require("@vendure/core");
/**
 * @description
 * Creates a {@link RequestContext} configured for the default Channel with the activeUser set
 * as the superadmin user. Useful for populating data.
 *
 * @docsCategory testing
 */
async function getSuperadminContext(app) {
    const defaultChannel = await app.get(core_1.ChannelService).getDefaultChannel();
    const connection = app.get(core_1.TransactionalConnection);
    const configService = app.get(core_1.ConfigService);
    const { superadminCredentials } = configService.authOptions;
    const superAdminUser = await connection
        .getRepository(core_1.User)
        .findOneOrFail({ where: { identifier: superadminCredentials.identifier } });
    return new core_1.RequestContext({
        channel: defaultChannel,
        apiType: 'admin',
        isAuthorized: true,
        authorizedAsOwnerOnly: false,
        session: {
            id: '',
            token: '',
            expires: new Date(),
            cacheExpiry: 999999,
            user: {
                id: superAdminUser.id,
                identifier: superAdminUser.identifier,
                verified: true,
                channelPermissions: [],
            },
        },
    });
}
exports.getSuperadminContext = getSuperadminContext;
//# sourceMappingURL=get-superadmin-context.js.map