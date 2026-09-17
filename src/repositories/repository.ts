/**
 * Contract every repository in this project implements.
 *
 * `T` is the persisted entity, `TCreate` the shape accepted when inserting and
 * `TUpdate` the (partial) shape accepted when updating. Keeping the contract in
 * one place means callers can depend on the interface instead of a concrete
 * repository, which is the point of the Repository Pattern.
 */
export interface IRepository<T, TCreate, TUpdate> {
  create(input: TCreate): T;
  findById(id: number): T | undefined;
  findAll(): T[];
  update(id: number, input: TUpdate): T | undefined;
  delete(id: number): boolean;
}
