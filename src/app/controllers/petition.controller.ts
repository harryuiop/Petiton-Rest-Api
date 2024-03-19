import {Request, Response} from "express";
import Logger from '../../config/logger';
import {validate} from "../services/validate";
import * as schemas from '../resources/schemas.json'
import {
    checkCategoryValid, checkTitleUnique,
    createPeition, createSupportTier,
    getAllPetitionFromSearchUnfilterd, getAllTitlesOfTier,
    getFullPetitionSupportTable,
    getIdFromAuthToken
} from "../models/petition.model";
import {getUserAuthToken} from "../models/user.model";

interface SupporterPetition {
    user_id: number;
    petition_id: number;
}

const getAllPetitions = async (req: Request, res: Response): Promise<void> => {
    try{
        // Validate the request body
        const validation = await validate(
            schemas.petition_search,
            req.query);

        // All valid types of sortBy
        const sortByTypes = ["ALPHABETICAL_ASC", "ALPHABETICAL_DESC", "COST_ASC", "COST_DESC","CREATED_DESC"]

        // Retrieve all the parameters
        const parameters = req.query as searchParameters;

        // Checks if parameter q is a valid string
        if (parameters.q === "") {
            res.statusMessage = "test"
            res.status(400).send();
            return;
        }

        // Checks if parameter sortBy is valid
        if (parameters.sortBy !== undefined && !(sortByTypes.includes(parameters.sortBy))) {
            res.statusMessage = "test"
            res.status(400).send();
            return;
        }

        // Checks if parameter supporterID is NaN
        if (parameters.supporterId !== undefined && isNaN(parseInt(parameters.supporterId,10))) {
            res.statusMessage = "test"
            res.status(400).send();
            return;
        }

        // Retrieve the entire table
        const receiveEntireTable = await getAllPetitionFromSearchUnfilterd();

        // Retrieve the supporters table
        const recieveEnitreSupporterPetition = await getFullPetitionSupportTable();

        // Grabs all the petitions for a specified supporter
        let petitionsSupportedByUser: number[] = []
        if (parameters.supporterId !== undefined) {
            petitionsSupportedByUser = recieveEnitreSupporterPetition.filter((supporter: any) => {
                return supporter.user_id.toString() === parameters.supporterId;
            }).map((supporter: any) => supporter.petition_id)
        }

        // Filter from the query parameters
        let filteredTable = receiveEntireTable.filter((query: any) => {

            if (parameters.q !== undefined &&
                !((query.title.toUpperCase().includes((parameters.q as string).toUpperCase() as string)) || query.description.toUpperCase().includes((parameters.q as string).toUpperCase()))) {
                return false;
            }
            if (parameters.categoryIds !== undefined && !(parameters.categoryIds.includes(query.categoryId.toString()))) {
                return false;
            }
            if (parameters.supportingCost !== undefined && query.supportingCost > parseInt(parameters.supportingCost, 10)) {
                return false;
            }
            if (parameters.ownerId !== undefined && query.ownerId.toString() !== parameters.ownerId) {
                return false;
            }
            const includeMe =  petitionsSupportedByUser.includes(query.petitionId)
            if (parameters.supporterId !== undefined && !includeMe) {
                return false;
            }
            return true;
        })

        // Sort the data if need be
        switch (parameters.sortBy) {
            case "ALPHABETICAL_ASC":
                filteredTable.sort((a: { title: string; }, b: { title: string; }) => a.title.localeCompare((b.title)));
                break;
            case "ALPHABETICAL_DESC":
                filteredTable.sort((a: { title: string; }, b: { title: string; }) => b.title.localeCompare((a.title)));
                break;
            case "COST_ASC":
                filteredTable.sort((a: { supportingCost: number; }, b: { supportingCost: number; }) => a.supportingCost - b.supportingCost);
                break;
            case "COST_DESC":
                filteredTable.sort((a: { supportingCost: number; }, b: { supportingCost: number; }) => b.supportingCost - a.supportingCost);
                break;
            case "CREATED_DESC":
                filteredTable.sort((a: { creationDate: string; }, b: { creationDate: string; }) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime());
                break;
            default:
                filteredTable.sort((a: { creationDate: string; }, b: { creationDate: string; }) => new Date(a.creationDate).getTime() - new Date(b.creationDate).getTime());
                break;
        }

        const numberOfMatchedQuerys = filteredTable.length;

        // Slice the front of the list to find the first value according to the start index
        if (parameters.startIndex !== undefined) {
            filteredTable = filteredTable.slice(parseInt(parameters.startIndex as string, 10), -1)

        // Slice the back of the list to find the last value according to the count
        }
        if (parameters.count !== undefined) {
            filteredTable = filteredTable.slice(0, parseInt(parameters.count as string, 10))
        }

        // Format the response
        const formattedResponse = {
            petitions: filteredTable.map((petition: any) => ({
                petitionId: petition.petitionId,
                title: petition.title,
                categoryId: petition.categoryId,
                ownerId: petition.ownerId,
                ownerFirstName: petition.ownerFirstName,
                ownerLastName: petition.ownerLastName,
                numberOfSupporters: petition.numberOfSupporters,
                creationDate: petition.creationDate,
                supportingCost: petition.supportingCost
            })),
            count: numberOfMatchedQuerys
        };

        res.status(200).send(formattedResponse);
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const getPetition = async (req: Request, res: Response): Promise<void> => {
    try{
        // Your code goes here
        res.statusMessage = "Not Implemented Yet!";
        res.status(501).send();
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const addPetition = async (req: Request, res: Response): Promise<void> => {
    try{
        // Validate data
        const validation = await validate(
            schemas.petition_post,
            req.body);
        if (validation !== true) {
            res.statusMessage = `Bad Request: ${validation.toString()}`;
            res.status(400).send();
            return;
            }

        // Unpack all the parameters
        const title = req.body.title;
        const description = req.body.description;
        const categoryId = req.body.categoryId;
        const authToken = req.header('X-Authorization');
        const dateTime = new Date()


        // Check if the categoryId references an existing category
        if (await checkCategoryValid(categoryId)) {
            res.statusMessage = "Catagory ID not referencing an existing catagory";
            res.status(400).send();
            return;
        }

        // Check if the title in unqiue
        if (await !checkTitleUnique(title)) {
            res.statusMessage = "Title must be unqiue";
            res.status(403).send();
            return;
        }

        // Get the current date
        const currentDate = new Date();

        // Format the date
        const formattedDate = formatDate(currentDate);

        // Get userId from authentication token
        const userId = await getIdFromAuthToken(authToken);

        // Create the petition and return the ID its creates it within the database
        const petitionIdReturned = await createPeition(title, description, formattedDate, parseInt(userId[0].id, 10), parseInt(categoryId, 10));

        // Check the amount of support tiers attched
        if ((req.body.supportTiers).length < 1 || (req.body.supportTiers).length > 3) {
            res.statusMessage = "A Petition must have between 1 and 3 supportTiers (inclusive)";
            res.status(400).send();
            return;
        }

        // Getting all supporter tier titles
        const getAllTitlesOfTiers = await getAllTitlesOfTier(petitionIdReturned.insertId);

        // Create all the support tiers
        for (let i = 0; i < (req.body.supportTiers).length; i++) {
            // Check if supportTier title is unique within those for the petition
            if (getAllTitlesOfTiers.includes(req.body.supportTiers[i].title)) {
                res.statusMessage = "Each supportTier.title must be unique within those for the petition";
                res.status(400).send();
                return;
            }
            createSupportTier(petitionIdReturned.insertId, req.body.supportTiers[i].title, req.body.supportTiers[i].description, parseInt(req.body.supportTiers[i].cost, 10));
        }

        res.statusMessage = "Petition and support tiers successfully created"
        res.status(201).send({"petitionId": petitionIdReturned.insertId});
        return;
    } catch (err) {
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

const editPetition = async (req: Request, res: Response): Promise<void> => {
    try{
        // Your code goes here
        res.statusMessage = "Not Implemented Yet!";
        res.status(501).send();
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const deletePetition = async (req: Request, res: Response): Promise<void> => {
    try{
        // Your code goes here
        res.statusMessage = "Not Implemented Yet!";
        res.status(501).send();
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const getCategories = async(req: Request, res: Response): Promise<void> => {
    try{
        // Your code goes here
        res.statusMessage = "Not Implemented Yet!";
        res.status(501).send();
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

export {getAllPetitions, getPetition, addPetition, editPetition, deletePetition, getCategories};