import type { Category, FinanceSnapshot, Fund, Movement } from '../domain/models'

export interface FinanceRepository {
  load(): Promise<FinanceSnapshot>
  saveFund(fund: Fund): Promise<void>
  saveCategory(category: Category): Promise<void>
  saveMovement(movement: Movement): Promise<void>
  deleteMovement(id: string): Promise<void>
  replaceSnapshot(snapshot: FinanceSnapshot): Promise<void>
}

const DB_NAME = 'control-money-web'
const DB_VERSION = 1

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('No se pudo completar la operación local.'))
  })
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('No se pudo guardar la información.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('La operación fue cancelada.'))
  })
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains('funds')) database.createObjectStore('funds', { keyPath: 'id' })
      if (!database.objectStoreNames.contains('categories')) {
        database.createObjectStore('categories', { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains('movements')) {
        const store = database.createObjectStore('movements', { keyPath: 'id' })
        store.createIndex('occurredAt', 'occurredAt')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('No se pudo abrir la base local.'))
  })
}

export class IndexedDbFinanceRepository implements FinanceRepository {
  async load(): Promise<FinanceSnapshot> {
    const database = await openDatabase()
    const transaction = database.transaction(['funds', 'categories', 'movements'], 'readonly')
    const [funds, categories, movements] = await Promise.all([
      requestResult(transaction.objectStore('funds').getAll() as IDBRequest<Fund[]>),
      requestResult(transaction.objectStore('categories').getAll() as IDBRequest<Category[]>),
      requestResult(transaction.objectStore('movements').getAll() as IDBRequest<Movement[]>),
    ])
    await transactionDone(transaction)
    database.close()
    return { funds, categories, movements }
  }

  saveFund(fund: Fund) {
    return this.put('funds', fund)
  }

  saveCategory(category: Category) {
    return this.put('categories', category)
  }

  saveMovement(movement: Movement) {
    return this.put('movements', movement)
  }

  async deleteMovement(id: string): Promise<void> {
    const database = await openDatabase()
    const transaction = database.transaction('movements', 'readwrite')
    transaction.objectStore('movements').delete(id)
    await transactionDone(transaction)
    database.close()
  }

  async replaceSnapshot(snapshot: FinanceSnapshot): Promise<void> {
    const database = await openDatabase()
    const transaction = database.transaction(['funds', 'categories', 'movements'], 'readwrite')
    const funds = transaction.objectStore('funds')
    const categories = transaction.objectStore('categories')
    const movements = transaction.objectStore('movements')
    funds.clear()
    categories.clear()
    movements.clear()
    snapshot.funds.forEach((fund) => funds.put(fund))
    snapshot.categories.forEach((category) => categories.put(category))
    snapshot.movements.forEach((movement) => movements.put(movement))
    await transactionDone(transaction)
    database.close()
  }

  private async put(storeName: 'funds' | 'categories' | 'movements', value: Fund | Category | Movement) {
    const database = await openDatabase()
    const transaction = database.transaction(storeName, 'readwrite')
    transaction.objectStore(storeName).put(value)
    await transactionDone(transaction)
    database.close()
  }
}
