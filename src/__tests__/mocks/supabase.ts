
export const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockReturnThis(),
    rpc: jest.fn().mockReturnThis(),
    auth: {
        signUp: jest.fn(),
        signInWithPassword: jest.fn(),
        signOut: jest.fn(),
        onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
        getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
};

// Helper to mock a successful response with data
export const mockSupabaseResponse = (data: any) => {
    return Promise.resolve({ data, error: null, count: null, status: 200, statusText: 'OK' });
};

// Helper to mock an error response
export const mockSupabaseError = (message: string) => {
    return Promise.resolve({
        data: null,
        error: { message, code: 'ERROR', details: '', hint: '' },
        count: null,
        status: 400,
        statusText: 'Bad Request'
    });
};
