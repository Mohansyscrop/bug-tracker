import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AttachmentsService {
  constructor(private prisma: PrismaService) {}

  async getAttachments(bugId: string) {
    const attachments = await this.prisma.attachment.findMany({
      where: { bugId },
      include: { uploadedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return { data: attachments };
  }

  /**
   * STUBBED: Returns a mock pre-signed URL.
   * In production, replace with real S3 pre-signed URL generation.
   */
  async getPresignedUrl(
    bugId: string,
    body: { fileName: string; mimeType: string; fileSizeBytes: number },
    uploadedById: string,
  ) {
    const storageKey = `bugs/${bugId}/${uuidv4()}-${body.fileName}`;
    
    // Create pending attachment record
    const attachment = await this.prisma.attachment.create({
      data: {
        bugId,
        uploadedById,
        fileName: body.fileName,
        fileSizeBytes: BigInt(body.fileSizeBytes),
        mimeType: body.mimeType,
        storageKey,
        scanStatus: 'PENDING',
      },
    });

    // STUB: In production use AWS SDK to generate pre-signed PUT URL
    const mockPresignedUrl = `http://localhost:9000/bugtracker-attachments/${storageKey}?stub=true`;

    return {
      data: {
        attachmentId: attachment.id,
        uploadUrl: mockPresignedUrl,
        storageKey,
        expiresIn: 300, // 5 minutes
      },
    };
  }

  /**
   * STUBBED: Marks attachment as CLEAN after simulated upload.
   * In production, this is triggered by an S3 event or antivirus webhook.
   */
  async confirmUpload(bugId: string, attachmentId: string) {
    const attachment = await this.prisma.attachment.update({
      where: { id: attachmentId },
      data: { scanStatus: 'CLEAN' }, // STUB: would be async via webhook in production
    });
    return { data: attachment };
  }
}
