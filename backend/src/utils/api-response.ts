class ApiResponse{
    constructor(
        public statusCode: number,
        public message: string,
        public data: unknown = null,
        public success: boolean = true,
        public errors: unknown[] = []
    ) {
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;
        this.success = success;
        this.errors = errors;
        
    }
}

export { ApiResponse };