import { AuthPageLayout } from '../../../components/auth/auth-page-layout';
import { ResetPasswordForm } from '../../../components/auth/reset-password-form';

export default function ResetPasswordPage() {
  return (
    <AuthPageLayout
      title="Choose a new password"
      description="Use a new password to restore access to your ShopCity account."
      pageId="reset-password-page"
    >
      <ResetPasswordForm />
    </AuthPageLayout>
  );
}
