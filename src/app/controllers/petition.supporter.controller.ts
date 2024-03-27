import {Request, Response} from "express";
import Logger from "../../config/logger";
import {
    checkSupporterTierExists,
    createSupporter,
    getAll,
    getAllSupportersAtTier
} from "../models/petition.supporter.model";
import {validate} from "../services/validate";
import * as schemas from '../resources/schemas.json'
import {
    checkAuthorized,
    checkIfPetitionHasSupporter,
    checkPetitionIdValid, getIdFromAuthToken,
    petitonAuthTable
} from "../models/petition.model";



const getAllSupportersForPetition = async (req: Request, res: Response): Promise<void> => {
    try{
        const petitionId = req.params.id;
        const result = await getAll(parseInt(petitionId, 10));

        // Check if the petition ID matches a petition
        if (result.length === 0) {
            res.statusMessage = "Not Found. No petition with id";
            res.status(404).send();
            return;
        }

        result.sort((a: { timestamp: string; }, b: { timestamp: string; }) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        res.status(200).send(result);
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const addSupporter = async (req: Request, res: Response): Promise<void> => {
    try{
        // Validate the request body
        const validation = await validate(
            schemas.support_post,
            req.body);
        if (validation !== true) {
            res.statusMessage = `Bad Request: ${validation.toString()}`;
            res.status(400).send();
            return;
        }

        const petitionId = req.params.id;
        const supportTierId = req.body.supportTierId;
        const message = req.body.message;
        const authToken = req.header('X-Authorization');
        const currentUserRows = await getIdFromAuthToken(authToken);

        // Check petitionId is a number
        if (isNaN(Number(petitionId))) {
            res.statusMessage = `Petition ID must be a number`;
            res.status(400).send();
            return;
        }

        const currentUserId = currentUserRows[0].id;

        // Check supporter tier exists
        const supportTierValid = await checkSupporterTierExists(parseInt(petitionId, 10), parseInt(supportTierId, 10));
        if (supportTierValid.length === 0) {
            res.statusMessage = `Forbidden. Support tier does not exist`;
            res.status(404).send();
            return;
        }

        // Check if the petition exists
        if (await checkPetitionIdValid(parseInt(petitionId, 10))) {
            res.statusMessage = "Not Found. No petition with id";
            res.status(404).send();
            return;
        }

        // Check request is authorized
        if (!(await checkAuthorized(authToken))) {
            res.statusMessage = `Unauthorized`;
            res.status(401).send();
            return;
        }

        // Check the owner of the given petition
        const petitonAuthTableR = await petitonAuthTable(parseInt(petitionId, 10));
        const authRow = petitonAuthTableR.filter((row: any) => row.petitionId === parseInt(petitionId, 10));

        // ToDo: Manual Test
        // Checks the authentication token against the owner of the petitions authentication token
        if (authToken === authRow[0].auth_token) {
            res.statusMessage = `Forbidden. Cannot support your own petition`;
            res.status(403).send();
            return;
        }

        // Get the entire list of supporters for a petition at a support tier
        const supporters = await getAllSupportersAtTier(parseInt(petitionId, 10), supportTierId);

        // Check you are not already supporting
        if (supporters[0].user_id === currentUserId) {
            res.statusMessage = `Forbidden. Already supported at this tier`;
            res.status(403).send();
            return;
        }

        // Get the current date
        const currentDate = new Date();
        const formattedDate = formatDate(currentDate);

        await createSupporter(parseInt(petitionId, 10), parseInt(supportTierId, 10), currentUserId, message, formattedDate)
        res.statusMessage = "Supporter has been added";
        res.status(201).send();
        return;
    } catch (err) {
        // ToDo: add these dups
        if (err.code === "ER_DUP_ENTRY") {
            res.statusMessage = "Petition Duplication";
            res.status(400).send();
            return;
        }
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}


function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export {getAllSupportersForPetition, addSupporter}