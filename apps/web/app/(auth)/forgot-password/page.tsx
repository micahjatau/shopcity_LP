import { AuthPageLayout } from '../../../components/auth/auth-page-layout';
import { ForgotPasswordForm } from '../../../components/auth/forgot-password-form';

export default function ForgotPasswordPage() {
  return (
    <AuthPageLayout
      title="Reset your password"
      description="We’ll send recovery instructions if this email is associated with a ShopCity account."
      pageId="forgot-password-page"
    >
      <ForgotPasswordForm />
    </AuthPageLayout>
  );
}
