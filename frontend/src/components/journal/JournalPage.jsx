import { forwardRef } from 'react';

/**
 * JournalPage - Leather-bound journal wrapper component
 * Provides the visual frame for all journal-style pages
 *
 * Props:
 * - children: Page content
 * - className: Additional classes for the page area
 * - showHeader: Whether to show the page header (default: false)
 * - headerContent: Custom header content
 * - marginContent: Content for the right margin annotation area
 * - hasMargin: Whether to show the margin area (default: false)
 */
const JournalPage = forwardRef(({
  children,
  className = '',
  showHeader = false,
  headerContent = null,
  marginContent = null,
  hasMargin = false,
  pageStyle = 'default' // 'default', 'fullbleed', 'compact'
}, ref) => {

  const pageStyles = {
    default: 'max-w-4xl mx-auto my-4 rounded-lg p-6 md:p-8',
    fullbleed: 'w-full min-h-screen',
    compact: 'max-w-2xl mx-auto my-4 rounded-lg p-4 md:p-6'
  };

  return (
    <div className="leather-frame" ref={ref}>
      {/* Leather binding texture overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-20 bg-gradient-to-b from-transparent via-amber-900/10 to-transparent" />

      {/* Page container */}
      <div className={`journal-page relative ${pageStyles[pageStyle]} ${className}`}>
        {/* Optional header */}
        {showHeader && headerContent && (
          <div className="journal-date mb-6">
            {headerContent}
          </div>
        )}

        {/* Main content area with optional margin */}
        <div className={`relative ${hasMargin ? 'pr-0 md:pr-52' : ''}`}>
          {/* Main content */}
          <div className="journal-entry">
            {children}
          </div>

          {/* Right margin annotation area */}
          {hasMargin && marginContent && (
            <div className="combat-margin hidden md:block">
              {marginContent}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

JournalPage.displayName = 'JournalPage';

export default JournalPage;
