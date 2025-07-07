import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface ProcessedFile {
  filename: string;
  originalName: string;
  type: string;
  size: number;
  content: string;
  url: string;
}

export class FileProcessor {
  private uploadsDir = path.join(process.cwd(), 'uploads');

  constructor() {
    this.ensureUploadDir();
  }

  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
    } catch (error) {
      console.error('Error creating uploads directory:', error);
    }
  }

  async processFile(file: Express.Multer.File): Promise<ProcessedFile> {
    const filename = this.generateFilename(file.originalname);
    const filepath = path.join(this.uploadsDir, filename);
    
    // Save file
    await fs.writeFile(filepath, file.buffer);

    // Extract text content based on file type
    const content = await this.extractTextContent(filepath, file.mimetype);

    return {
      filename,
      originalName: file.originalname,
      type: file.mimetype,
      size: file.size,
      content,
      url: `/uploads/${filename}`,
    };
  }

  private generateFilename(originalName: string): string {
    const ext = path.extname(originalName);
    const hash = crypto.randomBytes(16).toString('hex');
    return `${hash}${ext}`;
  }

  private async extractTextContent(filepath: string, mimetype: string): Promise<string> {
    try {
      switch (mimetype) {
        case 'text/plain':
          return await fs.readFile(filepath, 'utf8');
        
        case 'application/pdf':
          return await this.extractPdfText(filepath);
        
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          return await this.extractDocxText(filepath);
        
        default:
          throw new Error(`Unsupported file type: ${mimetype}`);
      }
    } catch (error) {
      console.error('Error extracting text content:', error);
      throw new Error('Failed to extract text from file');
    }
  }

  private async extractPdfText(filepath: string): Promise<string> {
    // For production, you would use a library like pdf-parse
    // For now, return a placeholder
    try {
      // const pdfParse = require('pdf-parse');
      // const buffer = await fs.readFile(filepath);
      // const data = await pdfParse(buffer);
      // return data.text;
      
      return '[PDF content extraction not implemented - would require pdf-parse library]';
    } catch (error) {
      throw new Error('Failed to extract PDF content');
    }
  }

  private async extractDocxText(filepath: string): Promise<string> {
    // For production, you would use a library like mammoth
    // For now, return a placeholder
    try {
      // const mammoth = require('mammoth');
      // const result = await mammoth.extractRawText({ path: filepath });
      // return result.value;
      
      return '[DOCX content extraction not implemented - would require mammoth library]';
    } catch (error) {
      throw new Error('Failed to extract DOCX content');
    }
  }

  async deleteFile(filename: string): Promise<boolean> {
    try {
      const filepath = path.join(this.uploadsDir, filename);
      await fs.unlink(filepath);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  async getFileStats(): Promise<{ totalFiles: number; totalSize: number }> {
    try {
      const files = await fs.readdir(this.uploadsDir);
      let totalSize = 0;
      
      for (const file of files) {
        const filepath = path.join(this.uploadsDir, file);
        const stats = await fs.stat(filepath);
        totalSize += stats.size;
      }
      
      return {
        totalFiles: files.length,
        totalSize,
      };
    } catch (error) {
      console.error('Error getting file stats:', error);
      return { totalFiles: 0, totalSize: 0 };
    }
  }
}

export const fileProcessor = new FileProcessor();
