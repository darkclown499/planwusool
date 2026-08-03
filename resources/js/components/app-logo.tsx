import AppLogoIcon from './app-logo-icon';

export default function AppLogo({ position }: { position?: 'left' | 'right' }) {
    return (
        <div dir={position === 'right' ? 'rtl' : position === 'left' ? 'ltr' : undefined} className="flex w-full items-center">
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-md">
                <AppLogoIcon className="size-5 fill-current text-white" />
            </div>
            <div className="ms-1 grid flex-1 truncate text-sm leading-none font-semibold text-start">
                Laravel Starter Kit
            </div>
        </div>
    );
}
