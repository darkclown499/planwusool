import React from 'react';
import { useTranslation } from 'react-i18next';
import { FlagIcon } from '@/components/FlagIcon';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';
import { usePage, router } from '@inertiajs/react';
import { hasRole } from '@/utils/authorization';

interface Language {
    code: string;
    name: string;
    countryCode: string;
    rtl?: boolean;
}

// Import languages from the JSON file
import languageData from '@/../../resources/lang/language.json';

export const LanguageSwitcher: React.FC = () => {
    const { i18n, t } = useTranslation();
    const { auth } = usePage().props as any;
    const currentLanguage = React.useMemo(() =>
        languageData.find(lang => lang.code === i18n.language) || languageData[0],
        [i18n.language]
    );

    const isAuthenticated = auth?.user;
    const userRoles = auth?.user?.roles?.map((role: any) => role.name) || [];
    const isSuperAdmin = isAuthenticated && hasRole('superadmin', userRoles);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" aria-label={t('Switch language')} className="flex items-center gap-2 h-8 rounded-md border">
                    <Globe className="h-4 w-4" />
                    <span className="text-sm font-medium hidden md:inline-block">
                        {currentLanguage.name}
                    </span>
                    <FlagIcon
                        countryCode={currentLanguage.countryCode}
                        svg
                        alt={currentLanguage.name}
                        style={{
                            width: '1.2em',
                            height: '1.2em',
                        }}
                    />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuGroup>
                    {languageData.map((language) => (
                        <DropdownMenuItem
                            key={language.code}
                            onClick={() => {
                                i18n.changeLanguage(language.code);

                                // Arabic-first design: the direction stays RTL no
                                // matter which language is selected (only the text
                                // translations change, the layout stays RTL).
                                document.documentElement.dir = 'rtl';
                                document.documentElement.setAttribute('dir', 'rtl');
                                localStorage.setItem('layoutDirection', 'rtl');

                                if (isAuthenticated) {
                                    router.post(route('user.language.update'), {
                                        language: language.code
                                    }, {
                                        preserveScroll: true,
                                        preserveState: true
                                    });
                                }
                            }}
                            className="flex items-center gap-2"
                        >
                            <FlagIcon
                                countryCode={language.countryCode}
                                svg
                                style={{
                                    width: '1.2em',
                                    height: '1.2em',
                                }}
                            />
                            <span>{language.name}</span>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuGroup>
                {isSuperAdmin && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild className="justify-center text-primary font-semibold cursor-pointer">
                            <a href={route('manage-language')} rel="noopener noreferrer">
                                Manage Language
                            </a>
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}; 