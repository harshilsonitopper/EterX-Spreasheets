export const vibrate = (pattern: number | number[] = 50) => {
    if (navigator.vibrate) {
        try {
            navigator.vibrate(pattern);
        } catch (e) {
            console.warn("Vibration failed. It might be disabled by the user's browser settings.", e);
        }
    }
};
