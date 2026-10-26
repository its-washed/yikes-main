export interface Challenge {
    readonly sig?: string | undefined;
    readonly n?: string | undefined;
}
export type SolverRequest = {
    readonly kind: "load";
    readonly handle: number;
    readonly source: string;
} | {
    readonly kind: "drop";
    readonly handle: number;
} | {
    readonly kind: "solve";
    readonly handle: number;
    readonly challenges: readonly Challenge[];
};
