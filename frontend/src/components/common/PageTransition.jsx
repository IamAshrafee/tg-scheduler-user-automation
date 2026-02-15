const PageTransition = ({ children, className = '' }) => {
    return (
        <div className={`page-enter ${className}`}>
            {children}
        </div>
    );
};

export default PageTransition;
