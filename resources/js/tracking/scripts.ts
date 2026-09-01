/**
 * Provider script injection with CSP nonce support. External SDK scripts are
 * loaded from their official fixed hosts; inline init snippets carry the
 * document-level nonce when one is shared by Inertia (cspNonce).
 */

export interface InjectedScript {
    /** Removes the injected node(s) from the DOM. */
    dispose: () => void;
}

export function injectExternalScript(
    src: string,
    attributes: Record<string, string> = {},
    nonce?: string,
): InjectedScript {
    const script = document.createElement('script');
    script.async = true;
    script.src = src;
    for (const [key, value] of Object.entries(attributes)) {
        script.setAttribute(key, value);
    }
    if (nonce) {
        script.setAttribute('nonce', nonce);
    }
    document.head.appendChild(script);

    return {
        dispose: () => {
            script.remove();
        },
    };
}

export function injectInlineScript(code: string, nonce?: string): InjectedScript {
    const script = document.createElement('script');
    script.textContent = code;
    if (nonce) {
        script.setAttribute('nonce', nonce);
    }
    document.head.appendChild(script);

    return {
        dispose: () => {
            script.remove();
        },
    };
}