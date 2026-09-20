import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

export interface UploadFileItem {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'attachments');

@Injectable()
export class AttachmentsService {
  constructor(private prisma: PrismaService) {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
  }

  async getAttachments(bugId: string) {
    const attachments = await this.prisma.attachment.findMany({
      where: { bugId },
      include: { uploadedBy: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return {
      data: attachments.map((a) => ({
        ...a,
        fileSizeBytes: Number(a.fileSizeBytes),
        url: `/api/v1/bugs/${bugId}/attachments/${a.id}/file`,
      })),
    };
  }

  async saveUploadedFiles(bugId: string, files: Array<UploadFileItem>, uploadedById: string) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const bug = await this.prisma.bug.findFirst({ where: { id: bugId, deletedAt: null } });
    if (!bug) throw new NotFoundException('Bug not found');

    const createdAttachments = [];

    for (const file of files) {
      const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storageKey = `${uuidv4()}-${sanitizedName}`;
      const filePath = path.join(UPLOAD_DIR, storageKey);

      fs.writeFileSync(filePath, file.buffer);

      const att = await this.prisma.attachment.create({
        data: {
          bugId,
          uploadedById,
          fileName: file.originalname,
          fileSizeBytes: BigInt(file.size),
          mimeType: file.mimetype,
          storageKey,
          scanStatus: 'CLEAN',
        },
        include: {
          uploadedBy: { select: { id: true, name: true, email: true } },
        },
      });

      createdAttachments.push({
        ...att,
        fileSizeBytes: Number(att.fileSizeBytes),
        url: `/api/v1/bugs/${bugId}/attachments/${att.id}/file`,
      });
    }

    return { data: createdAttachments };
  }

  async getAttachmentFile(bugId: string, attachmentId: string) {
    const attachment = await this.prisma.attachment.findFirst({
      where: { id: attachmentId, bugId },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');

    const filePath = path.join(UPLOAD_DIR, attachment.storageKey);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Attachment file not found on disk');
    }

    return {
      filePath,
      mimeType: attachment.mimeType,
      fileName: attachment.fileName,
    };
  }

  async deleteAttachment(bugId: string, attachmentId: string, userId: string, isAdmin: boolean) {
    const attachment = await this.prisma.attachment.findFirst({
      where: { id: attachmentId, bugId },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');

    if (!isAdmin && attachment.uploadedById !== userId) {
      throw new ForbiddenException('You are not authorized to delete this attachment');
    }

    const filePath = path.join(UPLOAD_DIR, attachment.storageKey);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {
        // ignore error deleting physical file
      }
    }

    await this.prisma.attachment.delete({ where: { id: attachmentId } });
    return { message: 'Attachment deleted' };
  }

  /**
   * Compatibility stub if needed
   */
  async getPresignedUrl(
    bugId: string,
    body: { fileName: string; mimeType: string; fileSizeBytes: number },
    uploadedById: string,
  ) {
    const storageKey = `bugs/${bugId}/${uuidv4()}-${body.fileName}`;
    const attachment = await this.prisma.attachment.create({
      data: {
        bugId,
        uploadedById,
        fileName: body.fileName,
        fileSizeBytes: BigInt(body.fileSizeBytes),
        mimeType: body.mimeType,
        storageKey,
        scanStatus: 'CLEAN',
      },
    });

    return {
      data: {
        attachmentId: attachment.id,
        uploadUrl: `/api/v1/bugs/${bugId}/attachments/${attachment.id}/file`,
        storageKey,
        expiresIn: 3600,
      },
    };
  }

  async confirmUpload(bugId: string, attachmentId: string) {
    const attachment = await this.prisma.attachment.update({
      where: { id: attachmentId },
      data: { scanStatus: 'CLEAN' },
    });
    return {
      data: {
        ...attachment,
        fileSizeBytes: Number(attachment.fileSizeBytes),
      },
    };
  }
}
