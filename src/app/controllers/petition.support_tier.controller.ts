import {Request, Response} from "express";
import Logger from "../../config/logger";
import {
    checkAuthorized, checkIfPetitionHasSupporter, checkPetitionIdValid, checkSupportTierIdValid,
    checkTitleUnique, createSupportTier, getAllTitlesOfTier,
    getSupportTiersFromPetitionId,
    petitonAuthTable
} from "../models/petition.model";
import {validate} from "../services/validate";
import * as schemas from "../resources/schemas.json";
import {
    checkIfSupportTierHasSupporter, checkNumberOfSupportTiers,
    checkPetitionExists, deleteSupportTiers,
    getSupportTierInfo,
    updateSupportTier
} from "../models/supportTiers.model";
import {checkSupporterTierExists} from "../models/petition.supporter.model";
import {getUserAuthToken, getUserIdFromAuthToken} from "../models/user.model";

const addSupportTier = async (req: Request, res: Response): Promise<void> => {
    try{
        // Validate the request body
        const validation = await validate(
            schemas.support_tier_post,
            req.body);
        if (validation !== true) {
            res.statusMessage = `Bad Request: ${validation.toString()}`;
            res.status(400).send();
            return;
        }

        // Grab all data from body
        const petitionId = req.params.id;
        const title = req.body.title;
        const description = req.body.description;
        const cost = req.body.cost;
        const authToken = req.header('X-Authorization');

        // Check petitionId is a number
        if (isNaN(Number(petitionId))) {
            res.statusMessage = `Petition ID must be a number`;
            res.status(400).send();
            return;
        }

        // Check cost is a number
        if (isNaN(Number(cost))) {
            res.statusMessage = `Cost must be a number`;
            res.status(400).send();
            return;
        }

        // Check if the petition exists
        const petitionFound = await checkPetitionExists(parseInt(petitionId, 10))
        if (petitionFound.length === 0) {
            res.statusMessage = "Petition not found";
            res.status(404).send();
            return;
        }

        // Check the owner of the given petition
        const petitonAuthTableR = await petitonAuthTable(parseInt(petitionId, 10));
        const authRow = petitonAuthTableR.filter((row: any) => row.petitionId === parseInt(petitionId, 10));

        // Check request is authorized
        if (!(await checkAuthorized(authToken))) {
            res.statusMessage = `Unauthorized`;
            res.status(401).send();
            return;
        }

        // Checks the authentication token against the owner of the petitions authentication token
        if (authToken !== authRow[0].auth_token) {
            res.statusMessage = `Forbidden. Only the owner of a petition may change it`;
            res.status(403).send();
            return;
        }

        // Get an array of all current tiers
        const currentTiers = await getSupportTiersFromPetitionId(parseInt(petitionId, 10));
        if (currentTiers.length > 2) {
            res.statusMessage = `Can not add a support tier if 3 already exist`;
            res.status(403).send();
            return;
        }

        // Check if title is unique
        const titlesInPetition = await getAllTitlesOfTier(parseInt(petitionId, 10));
        if (titlesInPetition.includes(title)) {
            res.statusMessage = "Forbidden. Support title not unique within petition";
            res.status(403).send();
            return;
        }

        await createSupportTier(parseInt(petitionId, 10), title, description, parseInt(cost, 10));
        res.statusMessage = "Support tier created";
        res.status(201).send();
        return;
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
            res.statusMessage = "Email Already in Use";
            res.status(403).send();
            return;
        }

        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const editSupportTier = async (req: Request, res: Response): Promise<void> => {
    try{
        // Validate the request body
        const validation = await validate(
            schemas.support_tier_patch,
            req.body);
        if (validation !== true) {
            res.statusMessage = `Bad Request: ${validation.toString()}`;
            res.status(400).send();
            return;
        }

        // Grab all data from body
        const petitionId = req.params.id;
        const tierId = req.params.tierId;
        const title = req.body.title;
        const description = req.body.description;
        const cost = req.body.cost;
        const authToken = req.header('X-Authorization');

        // Check petitionId is a number
        if (isNaN(Number(petitionId))) {
            res.statusMessage = `Petition ID must be a number`;
            res.status(400).send();
            return;
        }

        // Check if tier ID is a number
        if (isNaN(Number(tierId))) {
            res.statusMessage = "Not a valid petition ID";
            res.status(400).send()
            return;
        }

        if (await checkPetitionIdValid(parseInt(petitionId, 10))) {
            res.statusMessage = "Petition does not exist";
            res.status(400).send();
            return
        }

        if (await checkSupportTierIdValid(parseInt(tierId, 10))) {
            res.statusMessage = "Support tier does not exist";
            res.status(400).send();
            return
        }

        // Check the owner of the given petition
        const petitonAuthTableR = await petitonAuthTable(parseInt(petitionId, 10));
        const authRow = petitonAuthTableR.filter((row: any) => row.petitionId === parseInt(petitionId, 10));

        // Check request is authorized
        if (!(await checkAuthorized(authToken))) {
            res.statusMessage = `Unauthorized`;
            res.status(401).send();
            return;
        }

        // Checks the authentication token against the owner of the petitions authentication token
        if (authToken !== authRow[0].auth_token) {
            res.statusMessage = `Forbidden. Only the owner of a petition may change it`;
            res.status(403).send();
            return;
        }

        // Check if the petition exists
        const petitionFound = await checkPetitionExists(parseInt(petitionId, 10))
        if (petitionFound.length === 0) {
            res.statusMessage = "Petition not found";
            res.status(404).send();
            return;
        }

        // Check if title is unique
        const titlesInPetition = await getAllTitlesOfTier(parseInt(petitionId, 10));
        if (titlesInPetition.includes(title)) {
            res.statusMessage = "Forbidden. Support title not unique within petition";
            res.status(403).send();
            return;
        }

        // Check if petition has any supporters
        if (await checkIfPetitionHasSupporter(parseInt(petitionId, 10))) {
            res.statusMessage = "Forbidden. Can not edit a support tier if a supporter already exists for it";
            res.status(403).send();
            return;
        }

        // Get current support tier information
        const supportTierInfo = await getSupportTierInfo(parseInt(petitionId, 10), parseInt(tierId, 10));
        let currentTitle = supportTierInfo[0].title;
        let currentDescription = supportTierInfo[0].description;
        const currentCost = supportTierInfo[0].cost;

        if (title !== undefined) {
            updateSupportTier(parseInt(tierId, 10), title, currentDescription, currentCost, parseInt(petitionId, 10));
            currentTitle = title;
        }

        if (description !== undefined) {
            updateSupportTier(parseInt(tierId, 10), currentTitle, description, currentCost, parseInt(petitionId, 10));
            currentDescription = description;
        }

        if (cost !== undefined) {
            updateSupportTier(parseInt(tierId, 10), currentTitle, currentDescription, cost, parseInt(petitionId, 10));
        }

        res.statusMessage = "Support tier updated";
        res.status(200).send();
        return;
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
            res.statusMessage = "Email Already in Use";
            res.status(403).send();
            return;
        }

        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const deleteSupportTier = async (req: Request, res: Response): Promise<void> => {
    try{
        const petitionId = req.params.id;
        const tierId = req.params.tierId;
        const authToken = req.header('X-Authorization');

        // Check petition ID  not NaN
        if (isNaN(parseInt(petitionId, 10))) {
            res.statusMessage = `Petition ID must be a number`;
            res.status(400).send();
            return;
        }

        // Check if support tier exists
        const supportTier = await checkSupporterTierExists(parseInt(petitionId, 10), parseInt(tierId, 10));
        if (supportTier.length === 0) {
            res.statusMessage = `Support tier does not exist`;
            res.status(404).send();
            return;
        }

        // Check tier ID  not NaN
        if (isNaN(parseInt(tierId, 10))) {
            res.statusMessage = `Support Tier ID must be a number`;
            res.status(400).send();
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

        // Checks the authentication token against the owner of the petitions authentication token
        if (authToken !== authRow[0].auth_token) {
            res.statusMessage = `Forbidden. Only the owner of a petition may change it`;
            res.status(403).send();
            return;
        }

        // Check if tier has any supporters
        if (!checkIfSupportTierHasSupporter(parseInt(petitionId, 10), parseInt(tierId, 10))) {
            res.statusMessage = `Forbidden. an not delete a support tier if a supporter already exists for it`;
            res.status(403).send();
            return;
        }

        // Check that the only support tier is not being deleted
        if (await checkNumberOfSupportTiers(parseInt(petitionId, 10)) === 1) {
            res.statusMessage = `Forbidden. Can not remove a support tier if it is the only one for a petition`;
            res.status(403).send();
            return;
        }

        deleteSupportTiers(parseInt(petitionId, 10), parseInt(tierId, 10));
        res.statusMessage = "Support tier successfully deleted";
        res.status(200).send();
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

export {addSupportTier, editSupportTier, deleteSupportTier};