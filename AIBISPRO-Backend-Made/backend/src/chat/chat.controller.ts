import {
  Body,
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  BadRequestException,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ChatService } from "./chat.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@ApiTags("Chat")
@Controller("chat")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Ask the AI assistant (MAINTAINANCE/OWNER/MANAGER only) - grounded in real company data. Omit sessionId to start a new conversation.",
  })
  @UseGuards(JwtAuthGuard)
  @Post()
  async chat(
    @Body() body: { message: string; companyId?: number; sessionId?: string },
    @Req() req: any,
  ) {
    if (!body?.message || !body.message.trim()) {
      throw new BadRequestException("message is required");
    }
    return this.chatService.handleMessage(
      Number(req.user.id),
      req.user.role,
      body.message.trim(),
      body.companyId ? Number(body.companyId) : undefined,
      body.sessionId,
    );
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "List this user's past chat conversations (optionally filtered by company)",
  })
  @UseGuards(JwtAuthGuard)
  @Get("sessions")
  async sessions(@Query("companyId") companyId: string, @Req() req: any) {
    return this.chatService.getSessions(
      Number(req.user.id),
      companyId ? Number(companyId) : undefined,
    );
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: "Fetch the message history for one specific conversation session",
  })
  @UseGuards(JwtAuthGuard)
  @Get("history")
  async history(@Query("sessionId") sessionId: string, @Req() req: any) {
    if (!sessionId) return [];
    return this.chatService.getHistory(Number(req.user.id), sessionId);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete a conversation session" })
  @UseGuards(JwtAuthGuard)
  @Delete("sessions/:id")
  async deleteSession(@Param("id") id: string, @Req() req: any) {
    return this.chatService.deleteSession(id, Number(req.user.id));
  }
}
