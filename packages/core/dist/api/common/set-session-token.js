"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setSessionToken = void 0;
const ms_1 = __importDefault(require("ms"));
/**
 * Sets the authToken either as a cookie or as a response header, depending on the
 * config settings.
 */
function setSessionToken(options) {
    const { sessionToken, rememberMe, authOptions, req, res } = options;
    const usingCookie = authOptions.tokenMethod === 'cookie' ||
        (Array.isArray(authOptions.tokenMethod) && authOptions.tokenMethod.includes('cookie'));
    const usingBearer = authOptions.tokenMethod === 'bearer' ||
        (Array.isArray(authOptions.tokenMethod) && authOptions.tokenMethod.includes('bearer'));
    if (usingCookie) {
        if (req.session) {
            if (rememberMe) {
                req.sessionOptions.maxAge = (0, ms_1.default)('1y');
            }
            if (!sessionToken.length) {
                req.sessionOptions.expires = new Date(0);
            }
            req.session.token = sessionToken;
        }
    }
    if (usingBearer) {
        res.set(authOptions.authTokenHeaderKey, sessionToken);
    }
}
exports.setSessionToken = setSessionToken;
//# sourceMappingURL=set-session-token.js.map