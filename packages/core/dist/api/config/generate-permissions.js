"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePermissionEnum = void 0;
const stitch_1 = require("@graphql-tools/stitch");
const graphql_1 = require("graphql");
const constants_1 = require("../../common/constants");
const PERMISSION_DESCRIPTION = `@description
Permissions for administrators and customers. Used to control access to
GraphQL resolvers via the {@link Allow} decorator.

## Understanding Permission.Owner

\`Permission.Owner\` is a special permission which is used in some Vendure resolvers to indicate that that resolver should only
be accessible to the "owner" of that resource.

For example, the Shop API \`activeCustomer\` query resolver should only return the Customer object for the "owner" of that Customer, i.e.
based on the activeUserId of the current session. As a result, the resolver code looks like this:

@example
\`\`\`TypeScript
\\@Query()
\\@Allow(Permission.Owner)
async activeCustomer(\\@Ctx() ctx: RequestContext): Promise<Customer | undefined> {
  const userId = ctx.activeUserId;
  if (userId) {
    return this.customerService.findOneByUserId(ctx, userId);
  }
}
\`\`\`

Here we can see that the "ownership" must be enforced by custom logic inside the resolver. Since "ownership" cannot be defined generally
nor statically encoded at build-time, any resolvers using \`Permission.Owner\` **must** include logic to enforce that only the owner
of the resource has access. If not, then it is the equivalent of using \`Permission.Public\`.


@docsCategory common`;
/**
 * Generates the `Permission` GraphQL enum based on the default & custom permission definitions.
 */
function generatePermissionEnum(schema, customPermissions) {
    const allPermissionsMetadata = (0, constants_1.getAllPermissionsMetadata)(customPermissions);
    const values = {};
    let i = 0;
    for (const entry of allPermissionsMetadata) {
        values[entry.name] = {
            value: i,
            description: entry.description,
        };
        i++;
    }
    const permissionsEnum = new graphql_1.GraphQLEnumType({
        name: 'Permission',
        description: PERMISSION_DESCRIPTION,
        values,
    });
    return (0, stitch_1.stitchSchemas)({
        subschemas: [schema],
        types: [permissionsEnum],
        typeMergingOptions: { validationSettings: { validationLevel: stitch_1.ValidationLevel.Off } },
    });
}
exports.generatePermissionEnum = generatePermissionEnum;
//# sourceMappingURL=generate-permissions.js.map