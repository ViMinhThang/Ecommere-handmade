import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { CursorQueryDto } from './dto/cursor-query.dto';
import { SendTextMessageDto } from './dto/send-text-message.dto';
import { StartConversationDto } from './dto/start-conversation.dto';

const ALLOWED_IMAGE_TYPES = /^image\/(jpeg|jpg|png|gif|webp)$/;
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],
};

function validateFileContent(file: Express.Multer.File): void {
  const signatures = MAGIC_BYTES[file.mimetype];
  if (!signatures) {
    return;
  }

  for (const signature of signatures) {
    let matches = true;
    for (let i = 0; i < signature.length; i++) {
      if (file.buffer[i] !== signature[i]) {
        matches = false;
        break;
      }
    }

    if (matches) {
      return;
    }
  }

  throw new BadRequestException('File content does not match declared type');
}

@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Post('conversations/start')
  async startConversation(
    @Request() req: AuthenticatedRequest,
    @Body() dto: StartConversationDto,
  ) {
    const conversation = await this.chatService.startConversation(
      req.user.id,
      dto,
    );
    await this.chatGateway.emitConversationUpdated(conversation.id);
    return conversation;
  }

  @Get('conversations')
  listConversations(
    @Request() req: AuthenticatedRequest,
    @Query() query: CursorQueryDto,
  ) {
    return this.chatService.listConversations(req.user.id, query);
  }

  @Get('conversations/:conversationId/messages')
  getMessages(
    @Request() req: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
    @Query() query: CursorQueryDto,
  ) {
    return this.chatService.getMessages(req.user.id, conversationId, query);
  }

  @Post('conversations/:conversationId/messages/text')
  async sendTextMessage(
    @Request() req: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendTextMessageDto,
  ) {
    const message = await this.chatService.sendTextMessage(
      req.user.id,
      conversationId,
      dto,
    );
    await this.chatGateway.emitMessageCreated(conversationId, message);
    await this.chatGateway.emitConversationUpdated(conversationId);
    return message;
  }

  @Post('conversations/:conversationId/messages/image')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_IMAGE_TYPES.test(file.mimetype)) {
          callback(
            new BadRequestException(
              'Only JPEG, PNG, GIF, and WebP images are allowed',
            ),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  async sendImageMessage(
    @Request() req: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('caption') caption?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    if (caption && caption.length > 2000) {
      throw new BadRequestException('Caption must be at most 2000 characters');
    }

    validateFileContent(file);
    const message = await this.chatService.sendImageMessage(
      req.user.id,
      conversationId,
      file,
      caption,
    );

    await this.chatGateway.emitMessageCreated(conversationId, message);
    await this.chatGateway.emitConversationUpdated(conversationId);
    return message;
  }

  @Post('conversations/:conversationId/read')
  async markConversationRead(
    @Request() req: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
  ) {
    const result = await this.chatService.markConversationRead(
      req.user.id,
      conversationId,
    );
    await this.chatGateway.emitConversationUpdated(conversationId);
    return result;
  }

  @Get('unread-count')
  getUnreadCount(@Request() req: AuthenticatedRequest) {
    return this.chatService.getUnreadCount(req.user.id);
  }
}
