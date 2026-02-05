import type { NotificationType, NotificationConfigMap } from '../types/types';

// Notification types configuration with varied icons and titles
const NOTIFICATION_CONFIG: NotificationConfigMap = {
    success: {
        titles: ['Success', 'Completed', 'Done', 'Saved', 'Finished'],
        icons: [
            // Standard Check
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
            // Check Circle
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
            // Thumbs Up
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>',
            // Sparkles / Star
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>'
        ]
    },
    error: {
        titles: ['Error', 'Failed', 'Alert', 'Attention', 'Issue'],
        icons: [
            // X Lines
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
            // Alert Triangle
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
            // Octagon Alert
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
            // Circle Slash (Ban)
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>'
        ]
    },
    info: {
        titles: ['Info', 'Note', 'Notice', 'Update', 'Status'],
        icons: [
            // Info Circle
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
            // Bell / Notification
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>',
            // Lightbulb
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="9" y1="18" x2="15" y2="18"></line><line x1="10" y1="22" x2="14" y2="22"></line><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 16.5 8 4.5 4.5 0 0 0 12 3.5 4.5 4.5 0 0 0 7.5 8c0 1.62.9 3.03 2 3.97l1 1h4z"></path></svg>',
            // Message Circle
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>'
        ]
    },
    warning: {
        titles: ['Warning', 'Caution', 'Be Careful', 'Watch Out', 'Heads Up'],
        icons: [
            // Alert Triangle
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
            // Alert Circle
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'
        ]
    }
};

// Context-aware notification messages
const CONTEXT_MESSAGES = {
    save: {
        success: ['Changes saved successfully', 'Data saved', 'Your work has been saved'],
        error: ['Failed to save changes', 'Save operation failed', 'Could not save data']
    },
    delete: {
        success: ['Item deleted successfully', 'Deleted', 'Removal complete'],
        error: ['Failed to delete item', 'Delete operation failed', 'Could not remove item'],
        warning: ['This action cannot be undone']
    },
    create: {
        success: ['Created successfully', 'New item added', 'Creation complete'],
        error: ['Failed to create item', 'Creation failed', 'Could not create new item']
    },
    update: {
        success: ['Updated successfully', 'Changes applied', 'Update complete'],
        error: ['Failed to update', 'Update operation failed', 'Could not apply changes']
    },
    upload: {
        success: ['Upload complete', 'File uploaded successfully', 'Upload finished'],
        error: ['Upload failed', 'Could not upload file', 'Upload error occurred'],
        info: ['Uploading...', 'File upload in progress']
    },
    download: {
        success: ['Download complete', 'File downloaded successfully'],
        error: ['Download failed', 'Could not download file'],
        info: ['Downloading...', 'Download started']
    },
    login: {
        success: ['Welcome back!', 'Login successful', 'You\'re now logged in'],
        error: ['Login failed', 'Invalid credentials', 'Could not log you in']
    },
    logout: {
        success: ['Logged out successfully', 'You\'ve been logged out', 'Goodbye!'],
        error: ['Logout failed', 'Could not log you out']
    },
    validation: {
        error: ['Please check your input', 'Validation failed', 'Invalid data provided'],
        warning: ['Some fields need attention', 'Please review your entries']
    },
    network: {
        error: ['Network error occurred', 'Connection failed', 'No internet connection'],
        warning: ['Slow connection detected', 'Connection unstable']
    },
    permission: {
        error: ['Permission denied', 'You don\'t have access', 'Unauthorized action'],
        warning: ['Limited permissions', 'Some features are restricted']
    }
};

export class NotificationManager {
    private container: HTMLElement | null = null;
    private activeToasts: Set<HTMLElement> = new Set();
    private maxToasts: number = 5;

    private getContainer(): HTMLElement {
        if (!this.container) {
            const existing = document.getElementById('notification-container');
            if (existing) {
                this.container = existing;
            } else {
                console.warn("Notification container missing, creating one.");
                this.container = document.createElement('div');
                this.container.id = 'notification-container';
                this.container.className = 'notification-container';
                document.body.appendChild(this.container);
            }
        }
        return this.container;
    }

    private getRandomItem<T>(array: T[]): T {
        return array[Math.floor(Math.random() * array.length)];
    }

    private sanitizeHTML(str: string): string {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    private removeOldestToast(): void {
        if (this.activeToasts.size >= this.maxToasts) {
            const oldest = this.activeToasts.values().next().value;
            if (oldest) {
                this.dismissToast(oldest);
            }
        }
    }

    private dismissToast(toast: HTMLElement): void {
        toast.classList.remove('show');
        this.activeToasts.delete(toast);
        
        const onTransitionEnd = () => {
            toast.remove();
            toast.removeEventListener('transitionend', onTransitionEnd);
        };
        toast.addEventListener('transitionend', onTransitionEnd);
        
        // Fallback in case transition doesn't fire
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 600);
    }

    /**
     * Show a notification with automatic context detection
     * @param message - The notification message or context key
     * @param type - Type of notification (success, error, info, warning)
     * @param context - Optional context for more specific messaging (save, delete, create, etc.)
     */
    show(message: string, type: NotificationType = 'info', context?: string): void {
        const container = this.getContainer();
        
        // Remove oldest if we're at capacity
        this.removeOldestToast();
        
        const toast = document.createElement('div');
        toast.className = `notification-toast ${type}`;
        
        // Get config for type or fallback to info
        const config = NOTIFICATION_CONFIG[type] || NOTIFICATION_CONFIG['info'];
        
        // Select random icon and title
        const iconSvg = this.getRandomItem(config.icons);
        const title = this.getRandomItem(config.titles);
        
        // Use context-aware message if context is provided
        let displayMessage = message;
        if (context && CONTEXT_MESSAGES[context as keyof typeof CONTEXT_MESSAGES]) {
            const contextMessages = CONTEXT_MESSAGES[context as keyof typeof CONTEXT_MESSAGES] as any;
            if (contextMessages[type]) {
                displayMessage = this.getRandomItem(contextMessages[type]);
            }
        }
        
        // Sanitize message to prevent XSS
        const safeMessage = this.sanitizeHTML(displayMessage);
        
        // Structure: Icon | Content (Title + Message)
        toast.innerHTML = `
            <div class="notification-icon">${iconSvg}</div>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
            <div class="notification-message">${safeMessage}</div>
            </div>
        `;

        // Prepend to show newest at top
        container.insertBefore(toast, container.firstChild);
        this.activeToasts.add(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Auto-dismiss after delay
        const dismissDelay = type === 'error' ? 6000 : 4000; // Errors stay longer
        setTimeout(() => {
            this.dismissToast(toast);
        }, dismissDelay);
    }

    /**
     * Convenience methods for common actions
     */
    success(message: string, context?: string): void {
        this.show(message, 'success', context);
    }

    error(message: string, context?: string): void {
        this.show(message, 'error', context);
    }

    info(message: string, context?: string): void {
        this.show(message, 'info', context);
    }

    warning(message: string, context?: string): void {
        this.show(message, 'warning', context);
    }

    /**
     * Context-specific notification methods
     */
    saved(): void {
        this.show('', 'success', 'save');
    }

    saveFailed(): void {
        this.show('', 'error', 'save');
    }

    deleted(): void {
        this.show('', 'success', 'delete');
    }

    deleteFailed(): void {
        this.show('', 'error', 'delete');
    }

    created(): void {
        this.show('', 'success', 'create');
    }

    createFailed(): void {
        this.show('', 'error', 'create');
    }

    updated(): void {
        this.show('', 'success', 'update');
    }

    updateFailed(): void {
        this.show('', 'error', 'update');
    }

    uploaded(): void {
        this.show('', 'success', 'upload');
    }

    uploadFailed(): void {
        this.show('', 'error', 'upload');
    }

    uploading(): void {
        this.show('', 'info', 'upload');
    }

    /**
     * Clear all active notifications
     */
    clearAll(): void {
        this.activeToasts.forEach(toast => {
            this.dismissToast(toast);
        });
    }
}

export const notify = new NotificationManager();