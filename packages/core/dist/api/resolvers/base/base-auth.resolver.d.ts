import {
    AuthenticationResult as ShopAuthenticationResult,
    PasswordValidationError,
} from '@vendure/common/lib/generated-shop-types';
import {
    AuthenticationResult as AdminAuthenticationResult,
    CurrentUser,
    MutationAuthenticateArgs,
    MutationLoginArgs,
    Success,
} from '@vendure/common/lib/generated-types';
import { Request, Response } from 'express';
import {
    InvalidCredentialsError,
    NotVerifiedError,
} from '../../../common/error/generated-graphql-shop-errors';
import { ConfigService } from '../../../config/config.service';
import { User } from '../../../entity/user/user.entity';
import { AdministratorService } from '../../../service/services/administrator.service';
import { AuthService } from '../../../service/services/auth.service';
import { UserService } from '../../../service/services/user.service';
import { ApiType } from '../../common/get-api-type';
import { RequestContext } from '../../common/request-context';
export declare class BaseAuthResolver {
    protected authService: AuthService;
    protected userService: UserService;
    protected administratorService: AdministratorService;
    protected configService: ConfigService;
    constructor(
        authService: AuthService,
        userService: UserService,
        administratorService: AdministratorService,
        configService: ConfigService,
    );
    /**
     * Attempts a login given the username and password of a user. If successful, returns
     * the user data and returns the token either in a cookie or in the response body.
     */
    baseLogin(
        args: MutationLoginArgs,
        ctx: RequestContext,
        req: Request,
        res: Response,
    ): Promise<AdminAuthenticationResult | ShopAuthenticationResult | NotVerifiedError>;
    logout(ctx: RequestContext, req: Request, res: Response): Promise<Success>;
    /**
     * Returns information about the current authenticated user.
     */
    me(ctx: RequestContext, apiType: ApiType): Promise<CurrentUser | null>;
    /**
     * Creates an authenticated session and sets the session token.
     */
    protected authenticateAndCreateSession(
        ctx: RequestContext,
        args: MutationAuthenticateArgs,
        req: Request,
        res: Response,
    ): Promise<AdminAuthenticationResult | ShopAuthenticationResult | NotVerifiedError>;
    /**
     * Updates the password of an existing User.
     */
    protected updatePassword(
        ctx: RequestContext,
        currentPassword: string,
        newPassword: string,
    ): Promise<boolean | InvalidCredentialsError | PasswordValidationError>;
    /**
     * Exposes a subset of the User properties which we want to expose to the public API.
     */
    protected publiclyAccessibleUser(user: User): CurrentUser;
}
