import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import AppError from "../errors/AppError";
import UpdateSettingService from "../services/SettingServices/UpdateSettingService";
import ListSettingsService from "../services/SettingServices/ListSettingsService";
import { getDaysToClose, setDaysToClose } from "../services/SettingServices/ConfiguraFechamentoTicketService";

export const index = async (req: Request, res: Response): Promise<Response> => {
    const { tenantId } = req.user;

    const settings = await ListSettingsService(tenantId);

    return res.status(200).json(settings);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
    if (req.user.profile !== "admin") {
        throw new AppError("ERR_NO_PERMISSION", 403);
    }
    const { tenantId } = req.user;
    const { value, key } = req.body;

    const setting = await UpdateSettingService({
        key,
        value,
        tenantId
    });

    const io = getIO();
    io.emit(`${tenantId}:settings`, {
        action: "update",
        setting
    });

    return res.status(200).json(setting);
};

// Função para obter o valor de DAYS_TO_CLOSE_TICKET
export const getDaysToCloseTicket = async (req: Request, res: Response): Promise<Response> => {
    try {
        const daysToClose = await getDaysToClose();
        return res.json({ daysToClose });
    } catch (error) {
        console.error("Erro ao obter configuração:", error);
        return res.status(500).json({ error: "Erro ao obter configuração" });
    }
};

// Função para atualizar o valor de DAYS_TO_CLOSE_TICKET
export const updateDaysToCloseTicket = async (req: Request, res: Response): Promise<Response> => {
    if (req.user.profile !== "admin") {
        throw new AppError("ERR_NO_PERMISSION", 403);
    }
    
    const { daysToClose } = req.body;
    try {
        await setDaysToClose(daysToClose);

        const io = getIO();
        io.emit("settings:update", { action: "update", key: "DAYS_TO_CLOSE_TICKET", value: daysToClose });

        return res.status(200).json({ message: "Configuração atualizada com sucesso" });
    } catch (error) {
        console.error("Erro ao atualizar configuração:", error);
        return res.status(500).json({ error: "Erro ao atualizar configuração" });
    }
};