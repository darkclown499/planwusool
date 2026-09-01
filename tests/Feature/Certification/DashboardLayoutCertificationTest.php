<?php

namespace Tests\Feature\Certification;

use Tests\TestCase;

/**
 * CERTIFICATION: Dashboard layout / sidebar structural contracts.
 *
 * Protects against the double-sidebar-width-reservation gap and the sidebar
 * horizontal-overflow regression without asserting every Tailwind class.
 *
 * Expected architecture:
 *  - SidebarInset must NOT carry an additional duplicate
 *    peer-data-[side=right]:pr-[var(--sidebar-width)] offset (reservation happens
 *    once, via the sidebar flex gap/placeholder).
 *  - The main workspace is flex-1 + min-w-0, no global max-width on the
 *    merchant page wrapper.
 *  - Secondary (context) nav is conditional; no invisible secondary stub width.
 *  - SidebarContent keeps overflow-y-auto + overflow-x-hidden (local guard OK),
 *    but there is no global scrollbar mask hiding ALL horizontal scrollbars.
 */
class DashboardLayoutCertificationTest extends TestCase
{
    private function sidebarSrc(): string
    {
        return file_get_contents(resource_path('js/components/ui/sidebar.tsx'));
    }

    private function appSidebarSrc(): string
    {
        return file_get_contents(resource_path('js/components/app-sidebar.tsx'));
    }

    public function test_sidebar_inset_has_no_duplicate_sidebar_width_offset(): void
    {
        $src = $this->sidebarSrc();
        // Count occurrences of the right-side padding reservation token for
        // sidebar-width. It must appear at most once (a single reservation).
        $count = substr_count($src, 'peer-data-[side=right]:pr-[var(--sidebar-width)]');
        $this->assertLessThanOrEqual(
            1,
            $count,
            'SidebarInset must not duplicate the sidebar-width right offset reservation'
        );
    }

    public function test_workspace_is_flex1_minw0(): void
    {
        $src = $this->sidebarSrc();
        $this->assertStringContainsString('flex-1', $src);
        $this->assertStringContainsString('min-w-0', $src);
    }

    public function test_merchant_page_wrapper_has_no_global_max_width(): void
    {
        $dashboard = file_get_contents(resource_path('js/pages/dashboard.tsx'));
        // Content wrapper is fluid; a max-w would reintroduce the width gap.
        $this->assertStringNotContainsString('max-w-[', $dashboard);
    }

    public function test_secondary_context_nav_is_conditional(): void
    {
        $src = $this->appSidebarSrc();
        // Two-column desktop width only applies when context nav is active.
        $this->assertStringContainsString('desktopContextActive', $src);
        // No invisible secondary width: the width must branch on the flag.
        $this->assertStringContainsString('desktopContextActive ?', $src);
    }

    public function test_sidebar_content_scroll_guard_local(): void
    {
        $src = $this->sidebarSrc();
        // The local sidebar content scroll guard is acceptable.
        $this->assertStringContainsString('overflow-x-hidden', $src);
        $this->assertStringContainsString('overflow-y-auto', $src);
    }

    public function test_no_global_horizontal_scrollbar_mask_hack(): void
    {
        $css = file_get_contents(resource_path('css/app.css'));
        // Global mask of ALL horizontal scrollbars would conceal layout issues.
        $this->assertStringNotContainsString('::-webkit-scrollbar:horizontal', $css);
        // Hiding scrollbars is only legal inside scoped utilities (.no-scrollbar,
        // .in-iframe preview); the global thin-scrollbar styling only sizes/colors.
        if (preg_match_all('/[^{}]*::-webkit-scrollbar\s*\{[^}]*display\s*:\s*none/is', $css, $m)) {
            foreach ($m[0] as $rule) {
                $this->assertMatchesRegularExpression(
                    '/\.(no-scrollbar|in-iframe)[^{}]*::-webkit-scrollbar/',
                    $rule,
                    'scrollbar hiding must be scoped to explicit utilities only'
                );
            }
        }
        // Local [data-slot="sidebar-content"] x-overflow guard is acceptable.
        $this->assertStringContainsString('[data-slot="sidebar-content"]', $css);
    }
}
