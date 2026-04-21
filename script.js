// Intersection Observer for Scroll Animations
document.addEventListener('DOMContentLoaded', () => {

    // 1. Generic Fade In Up Animation
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const scrollObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                // Optional: Unobserve after animation completely
                // observer.unobserve(entry.target); 
            }
        });
    }, observerOptions);

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        scrollObserver.observe(el);
    });

    // 2. Interactive Steps Animation (Storyline concept)
    const stepsContainer = document.querySelector('.step-animation-container');
    const stepNodes = document.querySelectorAll('.step-node');
    const progressLine = document.getElementById('progress-line');

    if (stepsContainer && stepNodes.length > 0) {
        // Observer specifically for steps to light them up
        const stepObserverOptions = {
            root: null,
            rootMargin: '-20% 0px -40% 0px', // Trigger when step is near middle of screen
            threshold: 0
        };

        const stepObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    updateProgressLine();
                } else {
                    // entry.target.classList.remove('active'); // Optional: remove if you want them to turn off when scrolled past completely
                }
            });
        }, stepObserverOptions);

        stepNodes.forEach(node => {
            stepObserver.observe(node);
        });

        // Function to height animate the connecting line based on active nodes
        function updateProgressLine() {
            let activeCount = document.querySelectorAll('.step-node.active').length;
            let totalSteps = stepNodes.length;
            
            if(activeCount === 0) return;

            // Calculate percentage to fill line. Roughly based on which node is active
            let percentage = ((activeCount - 1) / (totalSteps - 1)) * 100;
            if(activeCount === 1) percentage = 15; // Just pass first circle
            if(activeCount === totalSteps) percentage = 100;

            progressLine.style.height = `${percentage}%`;
        }
    }

    // 3. FAQ Accordion
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const questionBtn = item.querySelector('.faq-question');
        const answerDiv = item.querySelector('.faq-answer');

        questionBtn.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // Close all items
            faqItems.forEach(faq => {
                faq.classList.remove('active');
                faq.querySelector('.faq-answer').style.maxHeight = null;
            });

            // Open clicked item if it was closed
            if (!isActive) {
                item.classList.add('active');
                answerDiv.style.maxHeight = answerDiv.scrollHeight + "px";
            }
        });
    });

    // Navbar background on scroll
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(11, 15, 25, 0.95)';
            navbar.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
        } else {
            navbar.style.background = 'rgba(11, 15, 25, 0.8)';
            navbar.style.boxShadow = 'none';
        }
    });
});
