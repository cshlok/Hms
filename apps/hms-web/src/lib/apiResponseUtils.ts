// /home/ubuntu/Hms/apps/hms-web/src/lib/apiResponseUtils.ts
import { NextResponse } from "next/server";

/**
 * Sends a standardized JSON error response.
 * @param message The error message.
 * @param status The HTTP status code.
 * @param details Optional additional details about the error.
 * @returns A NextResponse object with the error payload.
 */
export const sendErrorResponse = (message: string, status: number, details?: any) => {
  return NextResponse.json({ error: message, details: details || null }, { status });
};

/**
 * Sends a standardized JSON success response.
 * @param data The data payload to send.
 * @param status The HTTP status code (defaults to 200 for GET, 201 for POST/PUT if not specified).
 * @returns A NextResponse object with the success payload.
 */
export const sendSuccessResponse = (data: any, status: number = 200) => {
  return NextResponse.json(data, { status });
};

