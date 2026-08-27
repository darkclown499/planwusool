import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { type User } from '@/types';

export function UserInfo({
    user,
    showEmail = false,
    className = '',
    position,
}: {
    user: User;
    showEmail?: boolean;
    className?: string;
    position?: 'left' | 'right';
}) {
    const getInitials = useInitials();

    return (
        <div dir={position === 'right' ? 'rtl' : position === 'left' ? 'ltr' : undefined} className="flex w-full min-w-0 items-center gap-2 overflow-hidden">
            <Avatar className="h-8 w-8 shrink-0 overflow-hidden rounded-full">
                <AvatarImage src={user.avatar ?? undefined} alt={user.name} />
                <AvatarFallback className="rounded-lg bg-neutral-200 text-black">
                    {getInitials(user.name)}
                </AvatarFallback>
            </Avatar>
            <div className={`grid flex-1 min-w-0 text-sm leading-tight text-start overflow-hidden ${className}`}>
                <span className="truncate font-medium leading-none">{user.name}</span>
                {showEmail && <span className="text-muted-foreground truncate text-xs leading-none">{user.email}</span>}
            </div>
        </div>
    );
}
