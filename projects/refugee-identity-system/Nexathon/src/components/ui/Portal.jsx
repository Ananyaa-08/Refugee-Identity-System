import { createPortal } from 'react-dom';

/**
 * Render children on document.body so fixed overlays escape parent
 * transform/overflow stacking (e.g. page-enter animation on LoginPage).
 */
export const Portal = ({ children }) => {
    if (typeof document === 'undefined') return null;
    return createPortal(children, document.body);
};

export default Portal;
