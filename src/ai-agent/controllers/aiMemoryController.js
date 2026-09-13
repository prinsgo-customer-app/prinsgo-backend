const AIMemoryService = require('../services/AIMemoryService');

const createMemory = async (req, res) => {
    try {
        const { type, key, content, metadata, agentId, userId } = req.body;
        const memory = await AIMemoryService.createMemory(
            req.workspace._id,
            type,
            key,
            content,
            metadata,
            agentId,
            userId
        );
        res.status(201).json({ success: true, data: memory });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const mongoose = require('mongoose');

const getMemories = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const { query } = req.query;
        const result = await AIMemoryService.getMemories(req.workspace._id, page, limit, query);
        res.status(200).json({ success: true, data: result.memories, pagination: { total: result.total, page: result.page, pages: result.pages } });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const searchMemory = async (req, res) => {
    try {
        const { query } = req.query;
        const memories = await AIMemoryService.searchMemory(req.workspace._id, query || '');
        res.status(200).json({ success: true, data: memories });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const deleteMemory = async (req, res) => {
    try {
        const { memoryId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(memoryId)) {
            return res.status(400).json({ success: false, message: 'Invalid memory ID' });
        }
        await AIMemoryService.deleteMemory(memoryId);
        res.status(200).json({ success: true, message: 'Memory deleted' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = { createMemory, getMemories, searchMemory, deleteMemory };
