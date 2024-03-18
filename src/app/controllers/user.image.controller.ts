import {Request, Response} from "express";
import Logger from "../../config/logger";
import {
    checkUserHasProfileImage,
    getProfileImageFileNameFromId, removeUserProfileImage,
    updateUserProfileImage
} from "../models/user.image.model";
import {getOne, getUserAuthToken} from "../models/user.model";
import fs from 'fs';
import mime from "mime";
import {lookup} from "mz/dns";


const getImage = async (req: Request, res: Response): Promise<void> => {
    try{
        const userId = req.params.id;

        // Get the file name for the profile photo
        const filename = await getProfileImageFileNameFromId(userId);

        // If user does not have an image
        if (filename.length === 0 || userId === undefined) {
            res.statusMessage = `No user with specified ID, or user has no image`;
            res.status(404).send();
            return;
        }

        // Find the file type and update the content-type
        res.statusMessage = `Sending ${userId}'s profile photo`;
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
        const userId = parseInt(req.params.id, 10);
        const authToken = req.header('X-Authorization');
        const hasProfilePhoto = false;

        // Check if there is a user with the given user ID
        const userDetails = await getOne(userId);
        if (userDetails.length === 0) {
            res.statusMessage = "Not found. No such user with ID given";
            res.status(404).send();
            return;
        }

        // Check that the user trying to update data is authenticated
        const token = await getUserAuthToken(userId);
        if (token[0].auth_token !== authToken) {
            res.statusMessage = "User not authenticated";
            res.status(401).send();
            return;
        }

        // TODO: Check user isn't trying to change another users image


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
        const imageFilename = `user_${userId}.${mime.extension(contentType)}`;
        const imagePath : string = `storage/images/${imageFilename}`;

        fs.writeFileSync(imagePath, imageData);

        // Check if user already has a profile photo
        const checkForProfilePhoto = await checkUserHasProfileImage(userId);
        if (checkForProfilePhoto[0].image_filename === null) {
            await updateUserProfileImage(imageFilename, userId);
            res.statusMessage = "Create profile image";
            res.status(201).send();
            return;
        }

        await updateUserProfileImage(imageFilename, userId);
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

const deleteImage = async (req: Request, res: Response): Promise<void> => {
    try{
        const userId = parseInt(req.params.id, 10);
        const authToken = req.header('X-Authorization');

        // Check if the user ID is a valid number
        if (isNaN(Number(userId))) {
            res.statusMessage = "Not a valid user ID";
            res.status(400).send()
            return;
        }

        // Check if there is a user with the given user ID
        const userDetails = await getOne(userId);
        if (userDetails.length === 0) {
            res.statusMessage = "Not found. No such user with ID given";
            res.status(404).send();
            return;
        }

        // Check that the user trying to update data is authenticated
        const token = await getUserAuthToken(userId);
        if (token[0].auth_token !== authToken) {
            res.statusMessage = "User not authenticated";
            res.status(401).send();
            return;
        }

        // TODO: Check user isn't trying to change another users image


        // Delete the users image out of the database
        await removeUserProfileImage(userId);
        res.statusMessage = `User ${userId}'s profile image has been removed`
        res.status(200).send();
        return;
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

export {getImage, setImage, deleteImage}