import {Request, Response} from "express";
import Logger from '../../config/logger';
import * as User from '../models/user.model'
import * as model from "../models/user.model";
import {compare, generateToken, hash, isValidEmail} from "../services/passwords";
import {
    alterUserWithoutPassword,
    checkIfEmailExists,
    getHashedPasswordFromEmail,
    getOne,
    getPasswordFromId,
    getUserAuthToken,
    getUserIdAndTokenFromEmail,
    removeUserAuthToken,
    updatePassword,
    updateUserToken
} from "../models/user.model";

const register = async (req: Request, res: Response): Promise<void> => {
    try{
        // Grab all the user details
        const email = req.body.email;
        const firstName = req.body.firstName;
        const lastName = req.body.lastName;
        const password = req.body.password;

        // Check none of the fields are empty
        if (email === "" || firstName === "" || lastName === "" || password === "") {
            res.statusMessage = "No field can be empty";
            res.status(400).send();
            return;
        }

        // Hash password
        const hashedPassword = await hash(password); // Get the Promise from hash function

        // Validate the emails syntactically correct
        if (isValidEmail(email) === false) {
            res.statusMessage = "Email is not syntactically correct";
            res.status(400).send();
            return;
        }

        // Check if email already exists within the database
        checkIfEmailExists(email)

        // Validate the password is of at least size 6
        if (password.length < 6) {
            res.status(400).send();
            return;
        }

        // Register the User
        const result = await User.registerUser(email, firstName, lastName, await hashedPassword);
        res.status(201).send({"userId": result.insertId});
        return;

    } catch (err) {
        Logger.error(err);

        if (err.code === "ER_DATA_TOO_LONG") {
            res.statusMessage = "Data entry too long";
            res.status(400).send();
            return;
        }

        if (err.code === "ER_DUP_ENTRY") {
            res.statusMessage = "Email Already in Use";
            res.status(403).send();
            return;
        }

        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const login = async (req: Request, res: Response): Promise<void> => {
    try{
        // Grab email and password
        const email = req.body.email;
        const password = req.body.password;

        // Grab hashed password from user and perform a check to see if its matches
        const hashedPassword = await getHashedPasswordFromEmail(email);
        const extractedHashedPassword = hashedPassword[0].password;
        if (await compare(password, extractedHashedPassword) === false) {
            res.status(401).send();
            return;
        }

        // Generate Token
        const token = generateToken(30);

        // Updates the users token in the database
        await updateUserToken(token, email);

        // Returns userId and Token
        const result = await getUserIdAndTokenFromEmail(email);
        res.status(200).send({"userId": result[0].id, "token": result[0].auth_token})
        return;


    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const logout = async (req: Request, res: Response): Promise<void> => {
    try{
        const authToken = req.header('X-Authorization');

        // Todo: auth token already removed edge case ( exists in another user )

        // Check if a user is logged in
        if (authToken === undefined) {
            res.statusMessage = `Unauthorized. Cannot log out if you are not authenticated`;
            res.status(401).send();
            return;
        }

        // Remove auth token from the database
        const result = await removeUserAuthToken(authToken);
        res.statusMessage = `User has been logged out`;
        res.status(200).send();
        return;

    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const view = async (req: Request, res: Response): Promise<void> => {
    Logger.http(`GET single user id: ${req.params.id}`);
    const userId = req.params.id;
    const authToken = req.header('X-Authorization');

    try{
        // Check if the user ID is a valid number
        if (isNaN(Number(userId))) {
            res.statusMessage = "Not a valid user ID";
            res.status(400).send()
            return;
        }

        const result = await getOne(parseInt(userId, 10));

        // Check if result finds a user
        if (result.length === 0) {
            res.status(404).send('User not found');
            return
        }

        // Check if the user trying to update data is authenticated
        const token = await getUserAuthToken(parseInt(userId, 10));

        // For (un)authenticated users
        if (token[0].auth_token !== authToken) {
            res.statusMessage = "(un)authenticated GET request";
            res.status(200).send({"firstName": result[0].first_name, "lastName": result[0].last_name});
            return;
        }

        // For authenticated users
        res.statusMessage = "Authenticated GET request";
        res.status(200).send({"email": result[0].email, "firstName": result[0].first_name, "lastName": result[0].last_name});
        return;

    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const update = async (req: Request, res: Response): Promise<void> => {
    try {
        // Grab all the user details
        const email = req.body.email;
        const firstName = req.body.firstName;
        const lastName = req.body.lastName;
        const password = req.body.password;
        const currentPassword = req.body.currentPassword;
        const userId = parseInt(req.params.id, 10);
        const authToken = req.header('X-Authorization');

        // Check if user ID is a number
        if (isNaN(userId)) {
            res.statusMessage = "Not a valid user ID";
            res.status(400).send()
            return;
        }

        // Check that the user trying to update data is authenticated
        const token = await getUserAuthToken(userId);
        if (token[0].auth_token !== authToken) {
            res.statusMessage = "User not authenticated";
            res.status(401).send();
            return;
        }

        // Grab logged-in users details
        const user = await getOne(userId);
        const emailCurrent = user[0].email;
        const firstNameCurrent = user[0].first_name;
        const lastNameCurrent = user[0].last_name;

        // Update email if not null
        if (email !== undefined) {

            // Check the syntax of provided email
            if (isValidEmail(email) === false && email !== undefined) {
                res.statusMessage = "Email syntax incorrect";
                res.status(400).send()
                return;
            }

            // Check if email already exists within the database
            checkIfEmailExists(email);

            const result = alterUserWithoutPassword(email, firstNameCurrent, lastNameCurrent, userId);
            res.status(200).send();
            return;
        }

        // Update email if not null
        if (firstName !== undefined) {
            // Check first name is not an empty string
            if (firstName === "") {
                res.statusMessage = ("First name cannot be empty");
                res.status(400).send();
                return;
            }

            const result = alterUserWithoutPassword(emailCurrent, firstName, lastNameCurrent, userId);
            res.status(200).send();
            return;
        }

        // Update email if not null
        if (lastName !== undefined) {
            // Check last name is not an empty string
            if (lastName === "") {
                res.statusMessage = ("Last name cannot be empty");
                res.status(400).send();
                return;
            }

            const result = alterUserWithoutPassword(emailCurrent, firstNameCurrent, lastName, userId);
            res.status(200).send();
            return;
        }

        // Update Password if not null
        if (password !== undefined) {

            // Check The currentPassword must match the users existing password.
            const hashedPassword = await getPasswordFromId(userId);
            const extractedHashedPassword = hashedPassword[0].password;
            if (await compare(currentPassword, extractedHashedPassword) === false) {
                res.statusMessage = "Unauthorized or Invalid currentPassword";
                res.status(401).send();
                return;
            }

            // Check currentPassword and password must not be the same.
            if (await compare(password, extractedHashedPassword) === true) {
                res.statusMessage = "Current password cannot be the same as new password";
                res.status(403).send();
                return;
            }

            // Check currentPassword and password must be at least 6 characters
            if (password.length < 6) {
                res.statusMessage = "password must be at least 6 characters";
                res.status(400).send();
                return;
            }

            // Hash new password
            const newHashedPassword = await hash(password);
            const result = updatePassword(userId, newHashedPassword);

            res.statusMessage = "Password has been updated";
            res.status(200).send();
            return;
        }

    } catch (err) {
        Logger.error(err);

        if (err.code === "ER_DUP_ENTRY") {
            res.statusMessage = "Email Already in Use";
            res.status(403).send();
            return;
        }

        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

export {register, login, logout, view, update}