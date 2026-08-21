# API messages

INTENAL_SERVER_ERROR = "Internal server error"
VALUDATION_SERVER_ERROR = "Internal server validation error"

NOT_EXIST_ERROR = "{0} does not exist"
NOT_FOUND_ERROR = "{0} does not found"
RECORD_NOT_FOUND = "Record does not found"

USER_DOES_NOT_EXIST_ERROR = "User does not exist"
ARTICLE_DOES_NOT_EXIST_ERROR = "Article does not exist"
ARTICLE_ALREADY_EXISTS = "Article already exists"
USER_IS_NOT_AUTHOR_OF_ARTICLE = "You are not an author of this article"

INCORRECT_LOGIN_INPUT = "Incorrect email or password"
USERNAME_TAKEN = "User with this username already exists"
EMAIL_TAKEN = "User with this email already exists"
EMAIL_NOT_EXIST = "User with this email not exist"

UNABLE_TO_FOLLOW_YOURSELF = "User can not follow him self"
UNABLE_TO_UNSUBSCRIBE_FROM_YOURSELF = "User can not unsubscribe from him self"
USER_IS_NOT_FOLLOWED = "You don't follow this user"
USER_IS_ALREADY_FOLLOWED = "You follow this user already"

WRONG_TOKEN_PREFIX = "Unsupported authorization type"  # noqa: S105
MALFORMED_PAYLOAD = "Could not validate credentials"

ARTICLE_IS_ALREADY_FAVORITED = "You are already marked this articles as favorite"
ARTICLE_IS_NOT_FAVORITED = "Article is not favorited"

COMMENT_DOES_NOT_EXIST = "Comment does not exist"

AUTHENTICATION_REQUIRED = "Authentication required"
INVALID_ACCESS = "Invalid Access, Contact admin if you need access permission."

APPLICATION_NOT_IN_DESIRED_STATE = "Application is not in desired state."
APPLICATION_IN_APPROVED_STATE = "Application is already in approved."
APPLICATION_NOT_APPROVED_STATE = "Application is not in approved state."
APPLICATION_NOT_IN_VERIFIED_STATE = "Application is not in verified state."
APPLICATION_APPROVED_TYPE = "Application is already {0} approved."
RECORD_NOT_IN_DESIRED_STATE = "{0} action not possible as {1} is not in desired state."
APPLICATION_IN_VERIFICATION_STATE = "Loan is already verified."