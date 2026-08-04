import { SalesCall } from '../types';

/**
 * Busca u obtiene el ID de la carpeta "Auditorias" en el Google Drive del usuario.
 * Si no existe, la crea de forma automatizada y transparente.
 */
export async function findOrCreateFolder(token: string): Promise<string> {
  const folderName = 'Auditorias';
  
  // 1. Intentar buscar si la carpeta ya existe
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id)&pageSize=1`;
  const response = await fetch(searchUrl, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Error al buscar la carpeta en Drive: ${errText}`);
  }

  const searchData = await response.json();
  if (searchData.files && searchData.files.length > 0) {
    console.log(`[DRIVE_SYNC] Carpeta encontrada con ID: ${searchData.files[0].id}`);
    return searchData.files[0].id;
  }

  // 2. Si no existe, crear la carpeta
  console.log(`[DRIVE_SYNC] La carpeta "${folderName}" no existe. Creando carpeta...`);
  const createUrl = 'https://www.googleapis.com/drive/v3/files';
  const createResponse = await fetch(createUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    })
  });

  if (!createResponse.ok) {
    const errText = await createResponse.text();
    throw new Error(`Error al crear la carpeta en Google Drive: ${errText}`);
  }

  const folderData = await createResponse.json();
  console.log(`[DRIVE_SYNC] Carpeta creada exitosamente con ID: ${folderData.id}`);
  return folderData.id;
}

/**
 * Sube o actualiza la auditoría de llamada (en formato JSON) en el Google Drive del usuario.
 */
export async function uploadAuditToDrive(token: string, folderId: string, call: SalesCall): Promise<string> {
  const fileName = `audit_${call.id}.json`;

  try {
    // 1. Buscar si la auditoría ya existe para no duplicar y actualizarla
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and name='${fileName}' and trashed=false&fields=files(id)&pageSize=1`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    let fileId = '';
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        fileId = searchData.files[0].id;
      }
    }

    if (fileId) {
      console.log(`[DRIVE_SYNC] Actualizando archivo existente ${fileName} (ID: ${fileId})...`);
    } else {
      console.log(`[DRIVE_SYNC] Creando nuevo archivo ${fileName}...`);
      // Crear metadata de archivo primero
      const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: fileName,
          parents: [folderId],
          mimeType: 'application/json'
        })
      });

      if (!createRes.ok) {
        throw new Error(`Fallo al crear la metadata de la auditoría en Drive: ${await createRes.text()}`);
      }
      const fileData = await createRes.json();
      fileId = fileData.id;
    }

    // 2. Subir el contenido real JSON
    const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
    const uploadRes = await fetch(uploadUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(call)
    });

    if (!uploadRes.ok) {
      throw new Error(`Fallo al transferir datos de auditoría: ${await uploadRes.text()}`);
    }

    console.log(`[DRIVE_SYNC] Auditoría subida con éxito a Google Drive.`);
    return fileId;
  } catch (err: any) {
    console.error(`[DRIVE_SYNC_ERR] Error subiendo auditoría ${fileName}:`, err);
    throw err;
  }
}

/**
 * Lista y recopila las auditorías almacenadas en la carpeta de Drive del usuario.
 */
export async function listAuditFiles(token: string, folderId: string): Promise<{ id: string; name: string }[]> {
  const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and name contains 'audit_' and name contains '.json' and trashed=false&fields=files(id,name)&pageSize=1000`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`Fallo al listar auditorías en Drive: ${await response.text()}`);
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Descarga el contenido completo de un archivo de auditoría desde Drive mendiante su ID.
 */
export async function downloadAuditFromDrive(token: string, fileId: string): Promise<SalesCall> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`Fallo al descargar auditoría de Drive (ID: ${fileId}): ${await response.text()}`);
  }

  const call: SalesCall = await response.json();
  return call;
}

/**
 * Elimina una auditoría en Google Drive.
 */
export async function deleteAuditFromDrive(token: string, folderId: string, callId: string): Promise<void> {
  const fileName = `audit_${callId}.json`;
  try {
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and name='${fileName}' and trashed=false&fields=files(id)&pageSize=1`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        const fileId = searchData.files[0].id;
        console.log(`[DRIVE_SYNC] Eliminando archivo de auditoría de Drive: ${fileName} con ID: ${fileId}`);
        await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    }
  } catch (err) {
    console.error(`[DRIVE_SYNC_ERR] Fallo al eliminar la auditoría ${fileName} de Google Drive:`, err);
  }
}
