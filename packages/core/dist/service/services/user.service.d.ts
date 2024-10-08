import { ModuleRef } from '@nestjs/core';
import { VerifyCustomerAccountResult } from '@vendure/common/lib/generated-shop-types';
import { ID } from '@vendure/common/lib/shared-types';
import { RequestContext } from '../../api/common/request-context';
import { ErrorResultUnion } from '../../common/error/error-result';
import {
    IdentifierChangeTokenExpiredError,
    IdentifierChangeTokenInvalidError,
    InvalidCredentialsError,
    PasswordResetTokenExpiredError,
    PasswordResetTokenInvalidError,
    PasswordValidationError,
} from '../../common/error/generated-graphql-shop-errors';
import { ConfigService } from '../../config/config.service';
import { TransactionalConnection } from '../../connection/transactional-connection';
import { User } from '../../entity/user/user.entity';
import { PasswordCipher } from '../helpers/password-cipher/password-cipher';
import { VerificationTokenGenerator } from '../helpers/verification-token-generator/verification-token-generator';
import { RoleService } from './role.service';
/**
 * @description
 * Contains methods relating to {@link User} entities.
 *
 * @docsCategory services
 */
export declare class UserService {
    private connection;
    private configService;
    private roleService;
    private passwordCipher;
    private verificationTokenGenerator;
    private moduleRef;
    constructor(
        connection: TransactionalConnection,
        configService: ConfigService,
        roleService: RoleService,
        passwordCipher: PasswordCipher,
        verificationTokenGenerator: VerificationTokenGenerator,
        moduleRef: ModuleRef,
    );
    getUserById(ctx: RequestContext, userId: ID): Promise<User | undefined>;
    getUserByEmailAddress(
        ctx: RequestContext,
        emailAddress: string,
        userType?: 'administrator' | 'customer',
    ): Promise<User | undefined>;
    /**
     * @description
     * Creates a new User with the special `customer` Role and using the {@link NativeAuthenticationStrategy}.
     */
    createCustomerUser(
        ctx: RequestContext,
        identifier: string,
        password?: string,
    ): Promise<User | PasswordValidationError>;
    /**
     * @description
     * Adds a new {@link NativeAuthenticationMethod} to the User. If the {@link AuthOptions} `requireVerification`
     * is set to `true` (as is the default), the User will be marked as unverified until the email verification
     * flow is completed.
     */
    addNativeAuthenticationMethod(
        ctx: RequestContext,
        user: User,
        identifier: string,
        password?: string,
    ): Promise<User | PasswordValidationError>;
    /**
     * @description
     * Creates a new verified User using the {@link NativeAuthenticationStrategy}.
     */
    createAdminUser(ctx: RequestContext, identifier: string, password: string): Promise<User>;
    softDelete(ctx: RequestContext, userId: ID): Promise<void>;
    /**
     * @description
     * Sets the {@link NativeAuthenticationMethod} `verificationToken` as part of the User email verification
     * flow.
     */
    setVerificationToken(ctx: RequestContext, user: User): Promise<User>;
    /**
     * @description
     * Verifies a verificationToken by looking for a User which has previously had it set using the
     * `setVerificationToken()` method, and checks that the token is valid and has not expired.
     *
     * If valid, the User will be set to `verified: true`.
     */
    verifyUserByToken(
        ctx: RequestContext,
        verificationToken: string,
        password?: string,
    ): Promise<ErrorResultUnion<VerifyCustomerAccountResult, User>>;
    /**
     * @description
     * Sets the {@link NativeAuthenticationMethod} `passwordResetToken` as part of the User password reset
     * flow.
     */
    setPasswordResetToken(ctx: RequestContext, emailAddress: string): Promise<User | undefined>;
    /**
     * @description
     * Verifies a passwordResetToken by looking for a User which has previously had it set using the
     * `setPasswordResetToken()` method, and checks that the token is valid and has not expired.
     *
     * If valid, the User's credentials will be updated with the new password.
     */
    resetPasswordByToken(
        ctx: RequestContext,
        passwordResetToken: string,
        password: string,
    ): Promise<
        User | PasswordResetTokenExpiredError | PasswordResetTokenInvalidError | PasswordValidationError
    >;
    /**
     * @description
     * Changes the User identifier without an email verification step, so this should be only used when
     * an Administrator is setting a new email address.
     */
    changeUserAndNativeIdentifier(ctx: RequestContext, userId: ID, newIdentifier: string): Promise<void>;
    /**
     * @description
     * Sets the {@link NativeAuthenticationMethod} `identifierChangeToken` as part of the User email address change
     * flow.
     */
    setIdentifierChangeToken(ctx: RequestContext, user: User): Promise<User>;
    /**
     * @description
     * Changes the User identifier as part of the storefront flow used by Customers to set a
     * new email address, with the token previously set using the `setIdentifierChangeToken()` method.
     */
    changeIdentifierByToken(
        ctx: RequestContext,
        token: string,
    ): Promise<
        | {
              user: User;
              oldIdentifier: string;
          }
        | IdentifierChangeTokenInvalidError
        | IdentifierChangeTokenExpiredError
    >;
    /**
     * @description
     * Updates the password for a User with the {@link NativeAuthenticationMethod}.
     */
    updatePassword(
        ctx: RequestContext,
        userId: ID,
        currentPassword: string,
        newPassword: string,
    ): Promise<boolean | InvalidCredentialsError | PasswordValidationError>;
    private validatePassword;
}
