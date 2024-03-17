import {Request, Response} from "express";
import Logger from '../../config/logger';
import * as User from '../models/user.model'
import * as model from "../models/user.model";
import {compare, generateToken, hash, isValidEmail} from "../services/passwords";
import {
    alterUser,
    checkIfEmailExists,
    getHashedPasswordFromEmail,
    getOne,
    getPasswordFromId, updateUserToken
} from "../models/user.model";

const register = async (req: Request, res: Response): Promise<void> => {
    try{
        // Grab all the user details
        const email = req.body.email;
        const firstName = req.body.firstName;
        const lastName = req.body.lastName;
        const password = req.body.password;

        // Hash password
        const hashedPassword = await hash(password); // Get the Promise from hash function

        // Validate the emails syntactically correct
        if (isValidEmail(email) === false) {
            res.statusMessage = "Internal Server Error";
            res.status(500).send();
        }

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
        res.status(200).send()
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

const view = async (req: Request, res: Response): Promise<void> => {
    Logger.http(`GET single user id: ${req.params.id}`);
    const id = req.params.id;
    try{
        const result = await getOne(parseInt(id, 10));

        if (result.length === 0) {
            res.status(404).send('User not found');
            return
        }

        // Transforming the result to the desired format
        const formattedResult = {
            email: result[0].email,
            firstName: result[0].first_name,
            lastName: result[0].last_name,
        };

        res.status(200).send(formattedResult);
        return;

    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

const update = async (req: Request, res: Response): Promise<void> => {
    try{
        // Grab all the user details
        const email = req.body.email;
        const firstName = req.body.firstName;
        const lastName = req.body.lastName;
        const password = req.body.password;
        const currentPassword = req.body.currentPassword;
        const userId = req.params.id;

        // Check if user ID is a number
        if (isNaN(parseInt(userId, 10))) {
            res.statusMessage = "Not a valid user ID";
            res.status(400).send()
            return;
        }

        // Check the syntax of provided email
        if (isValidEmail(email) === false && email !== undefined) {
            res.statusMessage = "Email syntax incorrect";
            res.status(403).send()
            return;
        }

        // Check if email already exists within the database
        if (email !== undefined && await checkIfEmailExists(email) === false) {
            res.statusMessage = "Email already in use";
            res.status(403).send()
        }

        // Check The currentPassword must match the users existing password.
        const hashedPassword = await getPasswordFromId(parseInt(userId, 10));
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

        const result = alterUser(email, firstName, lastName, password, parseInt(userId, 10));
        res.status(200).send();
        return;

    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
}

export {register, login, logout, view, update}