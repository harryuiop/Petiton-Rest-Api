import {Request, Response} from "express";
import Logger from "../../config/logger";
import {
    checkTokenValid,
    checkUserHasProfileImage,
    getProfileImageFileNameFromId, removeUserProfileImage,
    updateUserProfileImage
} from "../models/user.image.model";
import {getOne, getUserAuthToken, getUserIdFromAuthToken} from "../models/user.model";
import fs from 'mz/fs';
import mime from "mime";


const getImage = async (req: Request, res: Response): Promise<void> => {
    try{
        const userId = req.params.id;

        // Check userId is defined
        if (userId === undefined) {
            res.statusMessage = `No user with specified ID, or user has no image`;
            res.status(404).send();
            return;
        }

        // Check if user exists
        const user = await getOne(parseInt(userId, 10));

        if (user.length === 0) {
            res.statusMessage = `No user with specified ID`;
            res.status(404).send();
            return;
        }

        // Get the file name for the profile photo
        const filename = await getProfileImageFileNameFromId(userId);
        // const fileExt = filename.split('.').pop();

        // If user does not have an image
        if (filename[0].image_filename === null) {
            res.statusMessage = `User has no image`;
            res.status(404).send();
            return;
        }

        // Find the file type and update the content-type
        res.statusMessage = `Sending ${userId}'s profile photo`;
        const fileTypeToSend : string = mime.lookup(filename[0].image_filename);
        res.contentType(fileTypeToSend);

        res.status(200).send(await fs.readFile(`storage/images/${filename[0].image_filename}`));
        // res.status(200).send();
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

        // Check that the token from the id matches the token in the params
        const idFromToken = await getUserIdFromAuthToken(authToken);
        if (idFromToken.length > 0 && idFromToken[0].id !== userId) {
            res.statusMessage = "Forbidden. Can not edit another user's information";
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

        // Check that the user trying to update data is authenticated and not forbidden
        const token = await getUserAuthToken(userId);
        if (checkTokenValid(authToken)) {
            if (token[0].auth_token !== authToken) {
                res.statusMessage = "Forbidden. Can not delete another user's profile photo";
                res.status(403).send();
                return;
            }
        } else {
            res.statusMessage = "User not authenticated";
            res.status(401).send();
            return;
        }

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