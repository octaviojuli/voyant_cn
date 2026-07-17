import {
  SignInPage,
  type SignInPageMessages,
  SignUpPage,
  type SignUpPageMessages,
  VerifyEmailPage,
  type VerifyEmailPageMessages,
} from "@voyant-travel/auth-react/ui"
import { buttonVariants } from "@voyant-travel/ui/components/button"
import { useCustomerPortalMutation } from "../customer-portal/hooks/index.js"
import { type StorefrontMessages, useStorefrontMessagesOrDefault } from "./messages.js"

type StorefrontAuthMessages = StorefrontMessages["auth"]

function toSignInMessages(auth: StorefrontAuthMessages): Partial<SignInPageMessages> {
  return {
    title: auth.signIn.title,
    description: auth.signIn.description,
    emailPlaceholder: auth.signIn.emailPlaceholder,
    submit: auth.signIn.submit,
    signingIn: auth.signIn.signingIn,
  }
}

function toSignUpMessages(auth: StorefrontAuthMessages): Partial<SignUpPageMessages> {
  return {
    title: auth.signUp.title,
    description: auth.signUp.description,
    nameLabel: auth.signUp.nameLabel,
    emailPlaceholder: auth.signUp.emailPlaceholder,
    submit: auth.signUp.submit,
    signingUp: auth.signUp.signingUp,
  }
}

function toVerifyEmailMessages(auth: StorefrontAuthMessages): Partial<VerifyEmailPageMessages> {
  return {
    title: auth.verifyEmail.title,
    description: auth.verifyEmail.description,
    successTitle: auth.verifyEmail.successTitle,
    successDescription: auth.verifyEmail.successDescription,
  }
}

export function CustomerSignInPage({
  onNavigate,
  redirectTo,
  verified = false,
}: {
  onNavigate: (to: string) => void
  redirectTo: string
  verified?: boolean
}): React.ReactElement {
  const auth = useStorefrontMessagesOrDefault().auth
  const customerPortal = useCustomerPortalMutation()
  return (
    <div className="mx-auto max-w-md py-10">
      {verified ? (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-green-900 text-sm">
          {auth.verifiedNotice}
        </div>
      ) : null}
      <SignInPage
        redirectTo={redirectTo}
        signUpHref={`/shop/account/sign-up?next=${encodeURIComponent(redirectTo)}`}
        messages={toSignInMessages(auth)}
        onSignedIn={async () => {
          await customerPortal.bootstrap.mutateAsync({ createCustomerIfMissing: true })
          onNavigate(redirectTo)
        }}
      />
      <StorefrontBackLink />
    </div>
  )
}

export function CustomerSignUpPage({
  onNavigateToVerify,
  redirectTo,
}: {
  onNavigateToVerify: (email: string) => void
  redirectTo: string
}): React.ReactElement {
  const auth = useStorefrontMessagesOrDefault().auth
  return (
    <div className="mx-auto max-w-md py-10">
      <SignUpPage
        redirectTo={redirectTo}
        signInHref={`/shop/account/sign-in?next=${encodeURIComponent(redirectTo)}`}
        messages={toSignUpMessages(auth)}
        onSignedUp={async ({ email }) => onNavigateToVerify(email)}
      />
      <StorefrontBackLink />
    </div>
  )
}

export function CustomerVerifyEmailPage({
  email,
  onCompleted,
  onNavigateToSignIn,
  onResendVerification,
  redirectTo,
}: {
  email?: string
  onCompleted: () => Promise<void>
  onNavigateToSignIn: () => void
  onResendVerification: (email: string) => Promise<void>
  redirectTo: string
}): React.ReactElement {
  const auth = useStorefrontMessagesOrDefault().auth
  return (
    <div className="mx-auto max-w-md py-10">
      <VerifyEmailPage
        mode="otp"
        email={email}
        signInHref={`/shop/account/sign-in?next=${encodeURIComponent(redirectTo)}&verify=1`}
        messages={toVerifyEmailMessages(auth)}
        onCompleted={onCompleted}
        onResendVerification={onResendVerification}
        onSignInClick={onNavigateToSignIn}
      />
    </div>
  )
}

function StorefrontBackLink(): React.ReactElement {
  const auth = useStorefrontMessagesOrDefault().auth
  return (
    <div className="mt-4 text-center">
      <a href="/shop" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        {auth.backToStorefront}
      </a>
    </div>
  )
}
