import {Request, Response} from "express";
import Logger from '../../config/logger';
import {validate} from "../services/validate";
import * as schemas from '../resources/schemas.json'
import {getAllPetitionFromSearchUnfilterd,isUserSupporterOfPetition} from "../models/petition.model";


const getAllPetitions = async (req: Request, res: Response): Promise<void> => {
    try{
        // Validate the request body
        const validation = await validate(
            schemas.petition_search,
            req.query);

        // Retrieve all the parameters
        const parameters = req.query as searchParameters;

        // Retrieve the entire table
        const receiveEntireTable = await getAllPetitionFromSearchUnfilterd();

        // Filter from the query parameters
        let filteredTable = receiveEntireTable.filter((query: any) => {
            if (parameters.q !== undefined &&
                !((query.title.toUpperCase().includes((parameters.q as string).toUpperCase() as string)) || query.description.toUpperCase().includes((parameters.q as string).toUpperCase()))) {
                return false;
            }
            if (parameters.categoryIds !== undefined && (query.categoryId.toString().includes(parameters.categoryIds))) {
                return false;
            }
            if (parameters.supportingCost !== undefined && query.supportingCost > parseInt(parameters.supportingCost, 10)) {
                return false;
            }
            if (parameters.ownerId !== undefined && query.ownerId.toString() !== parameters.ownerId) {
                return false;
            }
            if (parameters.supporterId !== undefined && !( isUserSupporterOfPetition(parseInt(parameters.supporterId, 10), query.petitionId))) {
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