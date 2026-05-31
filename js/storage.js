/**
 * Storage Module — localStorage persistence for user progress.
 */

const Storage = (() => {
    const STORAGE_KEY = 'ielts-dictation-progress';
    const SETTINGS_KEY = 'ielts-dictation-settings';

    /**
     * Load all progress data.
     * @returns {Object} { 'section-id': { currentIndex: number, completed: number[] } }
     */
    function loadProgress() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            console.warn('[Storage] Failed to load progress:', e);
            return {};
        }
    }

    /**
     * Save all progress data.
     */
    function saveProgress(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('[Storage] Failed to save progress:', e);
        }
    }

    /**
     * Get progress for a specific section.
     */
    function getSectionProgress(sectionId) {
        const data = loadProgress();
        return data[sectionId] || { currentIndex: 0, completed: [] };
    }

    /**
     * Update progress for a section.
     */
    function updateSectionProgress(sectionId, { currentIndex, completed }) {
        const data = loadProgress();
        data[sectionId] = { currentIndex, completed };
        saveProgress(data);
    }

    /**
     * Mark a sentence as completed (user has typed it).
     */
    function markCompleted(sectionId, sentenceIndex) {
        const data = loadProgress();
        if (!data[sectionId]) {
            data[sectionId] = { currentIndex: 0, completed: [] };
        }
        if (!data[sectionId].completed.includes(sentenceIndex)) {
            data[sectionId].completed.push(sentenceIndex);
        }
        saveProgress(data);
    }

    /**
     * Check if a sentence has been completed.
     */
    function isCompleted(sectionId, sentenceIndex) {
        const data = loadProgress();
        return data[sectionId]?.completed?.includes(sentenceIndex) || false;
    }

    /**
     * Reset progress for a section.
     */
    function resetSection(sectionId) {
        const data = loadProgress();
        delete data[sectionId];
        saveProgress(data);
    }

    /**
     * Reset all progress everywhere.
     */
    function resetAll() {
        localStorage.removeItem(STORAGE_KEY);
    }

    // ---- Settings ----

    function loadSettings() {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            return raw ? JSON.parse(raw) : { autoMode: false, ttsRate: 0.85 };
        } catch (e) {
            return { autoMode: false, ttsRate: 0.85 };
        }
    }

    function saveSettings(settings) {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        } catch (e) {
            console.warn('[Storage] Failed to save settings:', e);
        }
    }

    return {
        loadProgress,
        saveProgress,
        getSectionProgress,
        updateSectionProgress,
        markCompleted,
        isCompleted,
        resetSection,
        resetAll,
        loadSettings,
        saveSettings,
    };
})();
