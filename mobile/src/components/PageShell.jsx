import ScreenLayout from './ScreenLayout';

/** Full-height layout for stack screens (fixes blank pages on Expo web). */
export default function PageShell({ children, title, subtitle, ...rest }) {
  return (
    <ScreenLayout title={title} subtitle={subtitle} edges={['bottom']} {...rest}>
      {children}
    </ScreenLayout>
  );
}
