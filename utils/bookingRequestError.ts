type BookingRequestBlockState = "full" | "past" | "pending_passenger";

export type BookingRequestErrorDetails = {
  message: string;
  code?: string;
  status?: number;
  blockState?: BookingRequestBlockState;
};

const fallbackMessage = "Couldn't request the ride. Try again?";

export function describeBookingRequestError(error: any): BookingRequestErrorDetails {
  const responseData = error?.response?.data || {};
  const status = error?.response?.status ?? error?.status;
  const code = typeof responseData?.code === "string" ? responseData.code : undefined;
  const serverMessage = responseData?.message || responseData?.error;

  if (status === 401) {
    return { message: "Please log in to request a ride.", code, status };
  }

  if (status === 403) {
    return {
      message: serverMessage || "This ride isn't available to request.",
      code,
      status,
    };
  }

  if (status === 409) {
    if (code === "already_booked") {
      return {
        message: "You've already requested this ride.",
        code,
        status,
        blockState: "pending_passenger",
      };
    }

    if (code === "ride_full") {
      return {
        message: "This ride is full.",
        code,
        status,
        blockState: "full",
      };
    }

    if (code === "ride_started") {
      return {
        message: "This ride has already started.",
        code,
        status,
        blockState: "past",
      };
    }

    return {
      message: serverMessage || "You may have already requested this ride or it's full.",
      code,
      status,
    };
  }

  if (status === 400) {
    return {
      message: serverMessage || "Invalid request. Please check ride availability.",
      code,
      status,
    };
  }

  return {
    message: error?.message || fallbackMessage,
    code,
    status,
  };
}
