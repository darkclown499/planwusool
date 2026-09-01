import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { type User } from '@/types';

export function UserInfo({
    user,
    showEmail = false,
    className = '',
    position,
    compact = false,
}: {
    user: User;
    showEmail?: boolean;
    className?: string;
    position?: 'left' | 'right';
    compact?: boolean;
}) {
    const getInitials = useInitials();

    return (
        <div dir={position === 'right' ? 'rtl' : position === 'left' ? 'ltr' : undefined} className="flex w-full min-w-0 max-w-full items-center gap-2 overflow-hidden">
            <Avatar className={compact ? 'h-7 w-7 shrink-0 overflow-hidden rounded-full' : 'h-8 w-8 shrink-0 overflow-hidden rounded-full'}>
                <AvatarImage src={user.avatar ?? undefined} alt={user.name} />
                <AvatarFallback className="rounded-full bg-neutral-100 text-black text-xs">
                    {getInitials(user.name)}
                </AvatarFallback>
            </Avatar>
            <div className={`grid flex-1 min-w-0 max-w-full text-sm leading-tight text-start overflow-hidden ${className}`}>
                <span className="truncate font-medium leading-none text-[12.5px] text-gray-800 max-w-full">{user.name}</span>
                {showEmail ? (
                    <span className="text-muted-foreground truncate text-[11px] leading-none max-w-full">{user.email}</span>
                ) : (
                    <span className="truncate text-[11px] leading-none text-gray-500 max-w-full">{user.email}</span>
                )}
            </div>
        </div>
    );
}
