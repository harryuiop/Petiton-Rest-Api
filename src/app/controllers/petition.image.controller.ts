import {Request, Response} from "express";
import Logger from "../../config/logger";
import fs from 'fs';
import mime from "mime";
import {checkPetitionIdValid, getPetitionFromPetitionId, petitonAuthTable, checkAuthorized} from "../models/petition.model";
import {checkPetitonHasProfileImage, getProfileImageFileNameFromPetitionId} from "../models/petition.image.model";
import {validate} from "../services/validate";
import * as schemas from '../resources/schemas.json'
import {checkUserHasProfileImage, updateUserProfileImage} from "../models/user.image.model";



const getImage = async (req: Request, res: Response): Promise<void> => {
    try{
        const petitionId = req.params.id;

        // Check userId is defined
        if (petitionId === undefined) {
            res.statusMessage = `No user with specified ID, or user has no image`;
            res.status(404).send();
            return;
        }

        // Check if user exists
        const pet = await getPetitionFromPetitionId(parseInt(petitionId, 10));

        if (pet.length === 0) {
            res.statusMessage = `No user with specified ID`;
            res.status(404).send();
            return;
        }

        // Get the file name for the profile photo
        const filename = await getProfileImageFileNameFromPetitionId(parseInt(petitionId, 10))

        // If petition does not have an image
        if (filename[0].image_filename === null) {
            res.statusMessage = `User has no image`;
            res.status(404).send();
            return;
        }

        // Find the file type and update the content-type
        res.statusMessage = `Sending ${petitionId}'s profile photo`;
        const fileTypeToSend : string = mime.lookup(filename[0].image_filename);
        res.contentType(fileTypeToSend);

        res.sendFile(`/storage/images/${filename}`)
        res.status(200).send();
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const setImage = async (req: Request, res: Response): Promise<void> => {
    try{
        const petitionId = parseInt(req.params.id, 10);
        const authToken = req.header('X-Authorization');

        // Check if there is a petition with the given user ID
        const petitionDetails = await checkPetitionIdValid(petitionId);
        if (!petitionDetails) {
            res.statusMessage = "Not found. No such user with ID given";
            res.status(404).send();
            return;
        }

        // Check the owner of the given petition
        const petitonAuthTableR = await petitonAuthTable(petitionId);
        const authRow = petitonAuthTableR.filter((row: any) => row.petitionId === petitionId);

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

        // Determine the content type based on the file extension
        let contentType: string;
        const extension = req.headers['content-type'] as string;

        switch (extension) {
            case 'image/png':
                contentType = 'image/png';
                break;
            case 'image/jpeg':
            case 'image/jpg':
                contentType = 'image/jpeg';
                break;
            case 'image/gif':
                contentType = 'image/gif';
                break;
            default:
                res.status(400).send('Bad Request: Unsupported file type');
                return;
        }

        // Read image data from request body
        const imageData = req.body;

        // Save image locally
        const imageFilename = `petition_${petitionId}.${mime.extension(contentType)}`;
        const imagePath : string = `storage/images/${imageFilename}`;

        fs.writeFileSync(imagePath, imageData);


        // Check if user already has a profile photo
        const checkForProfilePhoto = await checkPetitonHasProfileImage(petitionId);
        if (checkForProfilePhoto[0].image_filename === null) {
            await updateUserProfileImage(imageFilename, petitionId);
            res.statusMessage = "Create profile image";
            res.status(201).send();
            return;
        }

        await updateUserProfileImage(imageFilename, petitionId);
        res.statusMessage = "Updated profile image";
        res.status(200).send();
        return;

    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}


export {getImage, setImage};