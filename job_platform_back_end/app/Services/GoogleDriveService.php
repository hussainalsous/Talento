<?php

namespace App\Services;

use Google\Client;
use Google\Service\Drive;
use Google\Service\Drive\DriveFile;
use Illuminate\Http\UploadedFile;

class GoogleDriveService
{
    private Drive $drive;

    public function __construct()
    {
        $client = new Client();
        $client->setAuthConfig(config('services.google.service_account_json_path'));
        $client->addScope(Drive::DRIVE_FILE);

        $this->drive = new Drive($client);
    }

    /**
     * Upload a PDF to the configured resume folder.
     * Returns the Google Drive file ID of the newly created file.
     */
    public function uploadPdf(UploadedFile $file, string $filename): string
    {
        $metadata = new DriveFile([
            'name'    => $filename,
            'parents' => [config('services.google.resume_folder_id')],
        ]);

        $uploaded = $this->drive->files->create($metadata, [
            'data'       => file_get_contents($file->getRealPath()),
            'mimeType'   => 'application/pdf',
            'uploadType' => 'multipart',
            'fields'     => 'id',
        ]);

        return $uploaded->getId();
    }
}
