const { google } = require('googleapis');
const { db } = require('./db');

const createOAuthClient = () => {
    return new google.auth.OAuth2(
        process.env.CLIENT_ID,
        process.env.CLIENT_SECRET,
        process.env.REDIRECT_URI
    );
};

const getDriveClient = async (userId) => {
    // Fetch refresh token
    const user = await new Promise((resolve, reject) => {
        db.get('SELECT google_drive_refresh_token FROM ucty WHERE id = ?', [userId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });

    if (!user || !user.google_drive_refresh_token) {
        throw new Error('No refresh token found for user'); // User needs to re-login to grant permission
    }

    const auth = createOAuthClient();
    auth.setCredentials({ refresh_token: user.google_drive_refresh_token });
    return google.drive({ version: 'v3', auth });
};

const ensureFolder = async (drive, folderName, parentId = 'root') => {
    // Check if exists
    // Note: 'drive.file' scope only finds files created by this app. 
    // If 'karierni-denik' was created by user manually, we might not see it with drive.file scope unless we are lucky.
    // However, usually it's better to create our own if we can't see one.
    const q = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${parentId}' in parents and trashed=false`;
    const res = await drive.files.list({ q, fields: 'files(id, name)' });
    
    if (res.data.files && res.data.files.length > 0) {
        return res.data.files[0].id;
    }

    // Create
    const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId]
    };
    const file = await drive.files.create({
        resource: fileMetadata,
        fields: 'id'
    });
    return file.data.id;
};

const { Readable } = require('stream');

const createDoc = async (drive, name, mimeType, folderId) => {
    const fileMetadata = {
        name: name,
        mimeType: mimeType, // 'application/vnd.google-apps.document', '...spreadsheet', '...presentation'
        parents: folderId ? [folderId] : []
    };
    
    // For pure creation of G-Suite docs we don't need media body usually, unless converting content
    const file = await drive.files.create({
        resource: fileMetadata,
        fields: 'id, name, webViewLink, webContentLink, iconLink, mimeType'
    });

    // Make public
    try {
        await drive.permissions.create({
            fileId: file.data.id,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });
    } catch (err) {
        console.error('Error setting public permission:', err);
    }
    
    return file.data;
};

const createFile = async (drive, name, mimeType, stream, folderId) => {
    const fileMetadata = {
        name: name,
        parents: folderId ? [folderId] : []
    };
    
    const media = {
        mimeType: mimeType,
        body: stream
    };
    
    const file = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink, webContentLink, iconLink, mimeType'
    });

    // Make public
    try {
        await drive.permissions.create({
            fileId: file.data.id,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });
    } catch (err) {
        console.error('Error setting public permission:', err);
    }

    return file.data;
};

const searchFiles = async (drive, query, folderId = 'root') => {
    // List files in the specified folder, optionally filtered by name
    let q = `'${folderId}' in parents and trashed = false`;
    if (query) {
        q += ` and name contains '${query}'`;
    }
    
    const res = await drive.files.list({
        q,
        pageSize: 40,
        fields: 'files(id, name, webViewLink, iconLink, mimeType, thumbnailLink)'
    });
    return res.data.files;
};

const makePublic = async (drive, fileId) => {
    try {
        await drive.permissions.create({
            fileId: fileId,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });
        return true;
    } catch (err) {
        console.error('Error setting public permission for file ' + fileId, err);
        return false;
    }
};

module.exports = { getDriveClient, ensureFolder, createDoc, createFile, searchFiles, makePublic };
